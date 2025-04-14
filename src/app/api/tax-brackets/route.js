// src/app/api/tax-brackets/route.js

import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml'; // You'll need to install js-yaml
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// POST route to store tax brackets
export async function POST() {
    try {
        // Read the YAML file
        const filePath = path.join(process.cwd(), 'tax_brackets.yaml');
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Parse YAML to JSON
        const taxBrackets = yaml.load(fileContents);

        // Store in database
        const stored = await prisma.taxBrackets.create({
            data: {
                content: JSON.stringify(taxBrackets), // Store as JSON string
                year: new Date().getFullYear() // Optional: store current year
            }
        });

        return NextResponse.json({
            message: 'Tax brackets stored successfully',
            data: stored
        });

    } catch (error) {
        console.error('Error storing tax brackets:', error);
        return NextResponse.json(
            { error: 'Failed to store tax brackets' },
            { status: 500 }
        );
    }
}

// Helper function to scrape tax brackets
async function scrapeTaxBrackets() {
    try {
        // -------------------Federal Tax Brackets-------------------
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
            taxBrackets[taxLabels[i]] = rows;
        });

        // -------------------Standard Deduction-------------------
        const sdPage = await axios.get('https://www.irs.gov/publications/p17');
        const $sd = cheerio.load(sdPage.data);

        const tableTitle = $sd('p.title').filter((_, el) => {
            return $sd(el).text().includes('Table 10-1');
        }).first();

        let standardDeduction = {};
        if (tableTitle.length) {
            let table = tableTitle.nextAll('table').first();
            if (!table.length) {
                table = tableTitle.parent().find('table').first();
            }
            if (!table.length) {
                const allTables = $sd('table');
                let foundIndex = -1;
                allTables.each((i, el) => {
                    if ($sd(el).prevAll('p.title').filter((_, title) =>
                        $sd(title).text().includes('Table 10-1')).length > 0) {
                        foundIndex = i;
                        return false;
                    }
                });
                if (foundIndex !== -1) {
                    table = allTables.eq(foundIndex);
                }
            }

            if (table.length) {
                table.find("tr").slice(1).each((i, row) => {
                    const cols = $sd(row).find("td");
                    if (cols.length === 2) {
                        const filingStatusText = $sd(cols[0]).text().trim();
                        const deductionText = $sd(cols[1]).text().trim();
                        const amountStr = deductionText.replace('$', '').replace(/,/g, '');
                        const amount = parseInt(amountStr, 10);
                        if (!isNaN(amount)) {
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
                    }
                });
            }
        }

        // -------------------Capital Gains Tax-------------------
        const cgPage = await axios.get('https://www.irs.gov/taxtopics/tc409');
        const $cg = cheerio.load(cgPage.data);

        let capitalGains = {
            single: {},
            married_separately: {},
            married_jointly: {},
            head_of_household: {}
        };

        const parseAmount = (str) => parseInt(str.replace(/,/g, ''));
        const mapStatuses = (statusText) => {
            const statuses = [];
            const text = statusText.toLowerCase();
            if (text.includes('single')) statuses.push('single');
            if (text.includes('married filing separately')) statuses.push('married_separately');
            if (text.includes('married filing jointly')) statuses.push('married_jointly');
            if (text.includes('head of household')) statuses.push('head_of_household');
            return statuses;
        };

        const ulElements = $cg('ul');
        let zeroRateUl = null;
        let fifteenRateUl = null;

        ulElements.each((_, ul) => {
            const listText = $cg(ul).find('li').map((_, li) => $cg(li).text()).get().join(' ');
            if (listText.includes('$')) {
                if (listText.includes('more than')) {
                    fifteenRateUl = ul;
                } else {
                    zeroRateUl = ul;
                }
            }
        });

        const patternZero = /\$([\d,]+)\s+for\s+(.+?)[;,\n\.]/;
        const patternFifteen = /more than \$([\d,]+)\s+but less than or equal to \$([\d,]+)\s+for\s+(.+?)[;,\n\.]/;

        if (zeroRateUl) {
            $cg(zeroRateUl).find('li').each((_, li) => {
                const text = $cg(li).text();
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

        if (fifteenRateUl) {
            $cg(fifteenRateUl).find('li').each((_, li) => {
                const text = $cg(li).text();
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

        // Structure the final result
        const result = {};
        Object.entries(taxBrackets).forEach(([status, brackets]) => {
            const newStatus = status.replace(/_/g, '-');
            if (!result[newStatus]) {
                result[newStatus] = {
                    income_tax: {
                        brackets: brackets.map(bracket => ({
                            min: parseInt(bracket.from.replace(/[$,]/g, '')),
                            max: bracket.to === "And up" ? "no_limit" : parseInt(bracket.to.replace(/[$,]/g, '')),
                            rate: parseFloat(bracket.tax_rate)
                        }))
                    },
                    capital_gains: {
                        brackets: []
                    },
                    standard_deduction: standardDeduction[status] || 0
                };
            }
        });

        Object.entries(capitalGains).forEach(([status, rates]) => {
            const newStatus = status.replace(/_/g, '-').replace('ly', '');
            if (result[newStatus]) {
                const brackets = [];
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

        return result;
    } catch (error) {
        console.error('Error scraping tax brackets:', error);
        throw error;
    }
}

// GET route to retrieve tax brackets
export async function GET() {
    try {
        console.log('🔍 Checking database for existing tax brackets...');
        // Check if we have tax brackets in the database
        const existingBrackets = await prisma.taxBrackets.findFirst({
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (existingBrackets) {
            console.log('✅ Found existing tax brackets in database from year:', existingBrackets.year);
            // Return existing brackets
            return NextResponse.json({
                data: JSON.parse(existingBrackets.content),
                source: 'database',
                year: existingBrackets.year
            });
        }

        console.log('❌ No tax brackets found in database');
        console.log('🔄 Starting web scraping process...');

        // If no brackets found, scrape and store them
        const scrapedBrackets = await scrapeTaxBrackets();
        const currentYear = new Date().getFullYear();

        console.log('✅ Successfully scraped tax brackets');
        console.log('💾 Storing tax brackets in database...');

        // Store in database
        const stored = await prisma.taxBrackets.create({
            data: {
                content: JSON.stringify(scrapedBrackets),
                year: currentYear
            }
        });

        console.log('✅ Successfully stored tax brackets in database with ID:', stored.id);

        return NextResponse.json({
            data: scrapedBrackets,
            source: 'scraped',
            year: currentYear
        });

    } catch (error) {
        console.error('❌ Error in GET route:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve tax brackets' },
            { status: 500 }
        );
    }
}