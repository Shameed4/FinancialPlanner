import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
    try {
        const yamlPath = path.join(process.cwd(), 'tax_brackets.yaml');

        // Check if YAML file exists and is from today
        if (fs.existsSync(yamlPath)) {
            const stats = fs.statSync(yamlPath);
            const fileDate = new Date(stats.mtime);
            const today = new Date();

            if (fileDate.toDateString() === today.toDateString()) {
                console.log('📚 Found existing tax data from today');
                const existingData = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
                return new Response(JSON.stringify({
                    message: 'Loaded from file',
                    data: existingData
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        console.log('🔄 No recent data found, fetching from IRS...');

        // -------------------Federal Tax Brackets-------------------
        console.log('🔍 Fetching federal tax brackets page...');
        const taxPage = await axios.get(
            'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets'
        );
        const $ = cheerio.load(taxPage.data);

        const taxLabels = [
            'single',
            'married_joint',
            'married_separate',
            'head_of_household'
        ];
        const taxTables = $('.table.complex-table.table-striped.table-bordered.table-responsive');
        const taxBrackets = {};

        console.log('📊 Parsing federal tax brackets...');
        taxTables.slice(0, 4).each((i, table) => {
            const rows = [];

            $(table).find('tbody tr').each((_, el) => {
                const columns = $(el).find('td');
                const taxRate = $(columns[0]).text().trim();
                const from = $(columns[1]).text().trim();
                const to = $(columns[2]).text().trim();

                if (taxRate && from && to) {
                    rows.push({ tax_rate: taxRate, from, to });
                }
            });

            console.log(`✅ Parsed ${rows.length} brackets for: ${taxLabels[i]}`);
            taxBrackets[taxLabels[i]] = rows;
        });

        // -------------------Standard Deduction-------------------
        console.log('🔍 Fetching standard deduction page...');
        const sdPage = await axios.get('https://www.irs.gov/publications/p17');
        const $sd = cheerio.load(sdPage.data);

        const tableTitle = $sd('p.title').filter((_, el) => {
            return $sd(el).text().includes('Table 10-1');
        }).first();

        console.log("DEBUG: Found table title:", tableTitle.length > 0);
        if (tableTitle.length > 0) {
            console.log("DEBUG: Table title text:", tableTitle.text().trim());
            console.log("DEBUG: Parent element:", tableTitle.parent().prop('tagName'));
            console.log("DEBUG: Next element tag:", tableTitle.next().prop('tagName'));
        }

        let standardDeduction = {};
        if (!tableTitle.length) {
            console.error("❌ Table 10-1 title not found.");
        } else {
            // Try multiple approaches to find the table
            let table = tableTitle.nextAll('table').first();

            if (!table.length) {
                console.log("DEBUG: Trying to find table in parent container...");
                table = tableTitle.parent().find('table').first();
            }

            if (!table.length) {
                console.log("DEBUG: Trying broader search after title...");
                // Find all tables on the page and get the first one after our title
                const allTables = $sd('table');
                let foundIndex = -1;
                allTables.each((i, el) => {
                    if ($sd(el).prevAll('p.title').filter((_, title) =>
                        $sd(title).text().includes('Table 10-1')).length > 0) {
                        foundIndex = i;
                        return false; // break the loop
                    }
                });
                if (foundIndex !== -1) {
                    table = allTables.eq(foundIndex);
                }
            }

            if (!table.length) {
                console.error("❌ Table not found after trying multiple approaches.");
                // Print nearby content for debugging
                console.log("DEBUG: Content around title:",
                    tableTitle.parent().text().slice(0, 200));
            } else {
                console.log("DEBUG: Number of rows in table:", table.find("tr").length);
                table.find("tr").slice(1).each((i, row) => {
                    const cols = $sd(row).find("td");
                    if (cols.length === 2) {
                        const filingStatusText = $sd(cols[0]).text().trim();
                        const deductionText = $sd(cols[1]).text().trim();
                        console.log(`DEBUG: Row ${i} - Filing status: '${filingStatusText}', Deduction: '${deductionText}'`);
                        const amountStr = deductionText.replace('$', '').replace(/,/g, '');
                        const amount = parseInt(amountStr, 10);
                        if (isNaN(amount)) {
                            console.warn(`⚠️ Could not convert deduction amount: ${deductionText}`);
                            return;
                        }
                        if (filingStatusText.includes("Single")) {
                            standardDeduction["single"] = amount;
                        }
                        if (filingStatusText.includes("Married filing separately")) {
                            standardDeduction["married_separate"] = amount;
                        }
                        if (filingStatusText.includes("Married filing jointly") || filingStatusText.includes("Qualifying surviving spouse")) {
                            standardDeduction["married_joint"] = amount;
                        }
                        if (filingStatusText.includes("Head of household")) {
                            standardDeduction["head_of_household"] = amount;
                        }
                    }
                });
            }
        }

        console.log('✅ Standard deduction parsed:', standardDeduction);

        // -------------------Capital Gains Tax-------------------
        console.log('🔍 Fetching capital gains tax page...');
        const cgPage = await axios.get('https://www.irs.gov/taxtopics/tc409');
        const $cg = cheerio.load(cgPage.data);

        let capitalGains = {
            single: {},
            married_separately: {},
            married_jointly: {},
            head_of_household: {}
        };

        // Helper function to parse amount strings
        const parseAmount = (str) => parseInt(str.replace(/,/g, ''));

        // Helper function to map status text to our standardized keys
        const mapStatuses = (statusText) => {
            const statuses = [];
            const text = statusText.toLowerCase();
            if (text.includes('single')) {
                statuses.push('single');
            }
            if (text.includes('married filing separately')) {
                statuses.push('married_separately');
            }
            if (text.includes('married filing jointly')) {
                statuses.push('married_jointly');
            }
            if (text.includes('head of household')) {
                statuses.push('head_of_household');
            }
            return statuses;
        };

        // Find all unordered lists
        const ulElements = $cg('ul');
        console.log("DEBUG: Found ul elements:", ulElements.length);

        // Find the specific lists containing our tax bracket information
        let zeroRateUl = null;
        let fifteenRateUl = null;

        ulElements.each((_, ul) => {
            const listText = $cg(ul).find('li').map((_, li) => $cg(li).text()).get().join(' ');
            console.log("DEBUG: List text:", listText.slice(0, 100));

            if (listText.includes('$')) {
                if (listText.includes('more than')) {
                    fifteenRateUl = ul;
                    console.log("DEBUG: Found fifteen rate list");
                } else {
                    zeroRateUl = ul;
                    console.log("DEBUG: Found zero rate list");
                }
            }
        });

        // Regular expressions for parsing the text
        const patternZero = /\$([\d,]+)\s+for\s+(.+?)[;,\n\.]/;
        const patternFifteen = /more than \$([\d,]+)\s+but less than or equal to \$([\d,]+)\s+for\s+(.+?)[;,\n\.]/;

        // Parse 0% threshold list
        if (zeroRateUl) {
            $cg(zeroRateUl).find('li').each((_, li) => {
                const text = $cg(li).text();
                console.log("DEBUG: Processing zero rate text:", text);
                const match = text.match(patternZero);
                if (match) {
                    const amount = parseAmount(match[1]);
                    const statuses = mapStatuses(match[2]);
                    statuses.forEach(status => {
                        capitalGains[status]["0%"] = { max: amount };
                    });
                }
            });
        }

        // Parse 15% threshold list
        if (fifteenRateUl) {
            $cg(fifteenRateUl).find('li').each((_, li) => {
                const text = $cg(li).text();
                console.log("DEBUG: Processing fifteen rate text:", text);
                const match = text.match(patternFifteen);
                if (match) {
                    const lower = parseAmount(match[1]);
                    const upper = parseAmount(match[2]);
                    const statuses = mapStatuses(match[3]);
                    statuses.forEach(status => {
                        capitalGains[status]["15%"] = { min: lower, max: upper };
                        capitalGains[status]["20%"] = { min: upper };
                    });
                }
            });
        }

        console.log('✅ Capital gains tax brackets parsed:', capitalGains);

        // Helper function to clean amount strings
        const cleanAmount = (str) => {
            if (str === "And up") return Infinity;
            return parseInt(str.replace(/[$,]/g, ''));
        };

        // Helper function to structure tax brackets by income
        const structureByIncome = (brackets) => {
            const incomeRanges = [];
            brackets.forEach(bracket => {
                incomeRanges.push({
                    min: cleanAmount(bracket.from),
                    max: cleanAmount(bracket.to) === Infinity ? "no_limit" : cleanAmount(bracket.to),
                    rate: parseFloat(bracket.tax_rate)
                });
            });
            return incomeRanges;
        };

        // Create the new structured result
        const result = {};

        // Process federal tax brackets
        Object.entries(taxBrackets).forEach(([status, brackets]) => {
            const newStatus = status.replace(/_/g, '-');
            if (!result[newStatus]) {
                result[newStatus] = {
                    income_tax: {
                        brackets: structureByIncome(brackets)
                    },
                    capital_gains: {
                        brackets: []
                    },
                    standard_deduction: standardDeduction[status] || 0
                };
            }
        });

        // Process capital gains
        Object.entries(capitalGains).forEach(([status, rates]) => {
            const newStatus = status.replace(/_/g, '-').replace('ly', '');
            if (result[newStatus]) {
                const brackets = [];

                // Sort rates to ensure 0%, 15%, 20% order
                const sortedRates = Object.entries(rates).sort((a, b) => {
                    return parseFloat(a[0]) - parseFloat(b[0]);
                });

                sortedRates.forEach(([rate, thresholds]) => {
                    const rateValue = parseFloat(rate);
                    const min = thresholds.min || 0;
                    const max = thresholds.max || "no_limit";

                    brackets.push({
                        min: parseInt(min),
                        max: max === "no_limit" ? "no_limit" : parseInt(max),
                        rate: rateValue
                    });
                });

                result[newStatus].capital_gains.brackets = brackets;
            }
        });

        // Format the YAML with consistent indentation
        const yamlData = yaml.dump(result, {
            indent: 2,
            lineWidth: -1,
            sortKeys: true
        });

        // Save YAML file
        fs.writeFileSync(yamlPath, yamlData, 'utf8');
        console.log(`📝 YAML file saved at ${yamlPath}`);

        return new Response(JSON.stringify({
            message: 'Fetched from IRS and saved',
            data: result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
        });
    }
}