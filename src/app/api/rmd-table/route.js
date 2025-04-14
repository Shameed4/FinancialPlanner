import axios from 'axios';
import * as cheerio from 'cheerio';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to scrape RMD table
async function scrapeRMDTable() {
    try {
        // Fetch the IRS publication page
        const response = await axios.get('https://www.irs.gov/publications/p590b');
        const html = response.data;

        // Load the fetched HTML into Cheerio
        const $ = cheerio.load(html);

        // Locate the table by its summary attribute (or part of the title).
        const table = $('table[summary*="Uniform Lifetime"]');

        if (!table.length) {
            throw new Error("Table not found on the page.");
        }

        const scrapedData = [];

        // Iterate over each row of the table
        table.find('tr').each((i, row) => {
            const cells = $(row).find('td');
            // Process rows containing 4 cells (left and right columns)
            if (cells.length === 4) {
                // Extract and trim text from each cell.
                const leftAge = $(cells[0]).text().trim();
                const leftDistribution = $(cells[1]).text().trim();
                const rightAge = $(cells[2]).text().trim();
                const rightDistribution = $(cells[3]).text().trim();

                // Define a simple check to verify the cell contains numeric content.
                const isNumeric = (str) => /\d/.test(str);

                // Add the left-hand side data (if it contains numeric information)
                if (leftAge && isNumeric(leftAge)) {
                    scrapedData.push({
                        age: leftAge,
                        distributionPeriod: leftDistribution,
                    });
                }

                // Add the right-hand side data (if it contains numeric information)
                if (rightAge && isNumeric(rightAge)) {
                    scrapedData.push({
                        age: rightAge,
                        distributionPeriod: rightDistribution,
                    });
                }
            }
        });

        return scrapedData;
    } catch (error) {
        console.error("Error scraping the RMD table:", error);
        throw error;
    }
}

// POST route to store RMD table
export async function POST() {
    try {
        // Read the YAML file
        const filePath = path.join(process.cwd(), 'rmd_table.yaml');
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Parse YAML to JSON
        const rmdTable = yaml.load(fileContents);

        // Store in database
        const stored = await prisma.RMDTable.create({
            data: {
                content: JSON.stringify(rmdTable), // Store as JSON string
                year: new Date().getFullYear() // Store current year
            }
        });

        return NextResponse.json({
            message: 'RMD table stored successfully',
            data: stored
        });

    } catch (error) {
        console.error('Error storing RMD table:', error);
        return NextResponse.json(
            { error: 'Failed to store RMD table' },
            { status: 500 }
        );
    }
}

// GET route to retrieve RMD table
export async function GET() {
    try {
        console.log('🔍 Checking database for existing RMD table...');
        const currentYear = new Date().getFullYear();

        // Check if we have RMD table in the database
        const existingTable = await prisma.RMDTable.findFirst({
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (existingTable && existingTable.year === currentYear) {
            console.log('✅ Found existing RMD table in database from current year:', existingTable.year);
            // Return existing table
            return NextResponse.json({
                lifetimeTable: JSON.parse(existingTable.content).lifetimeTable,
                source: 'database',
                year: existingTable.year,
                lastUpdated: existingTable.createdAt.toISOString()
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
                }
            });
        }

        console.log(existingTable ?
            `🔄 Found RMD table from year ${existingTable.year}, but need current year ${currentYear}` :
            '❌ No RMD table found in database');
        console.log('🔄 Starting web scraping process...');

        // If no table found or not from current year, scrape and store it
        const scrapedData = await scrapeRMDTable();

        // Convert the scraped data into a YAML format
        const yamlString = yaml.dump({ lifetimeTable: scrapedData });

        // Define the path to store the YAML file
        const filePath = path.join(process.cwd(), 'data', 'rmd_table.yaml');
        // Ensure the "data" folder exists
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        // Write the YAML file
        fs.writeFileSync(filePath, yamlString, 'utf8');

        console.log('✅ Successfully scraped RMD table');
        console.log('💾 Storing RMD table in database...');

        // Store in database
        const stored = await prisma.RMDTable.create({
            data: {
                content: JSON.stringify({ lifetimeTable: scrapedData }),
                year: currentYear
            }
        });

        console.log('✅ Successfully stored RMD table in database with ID:', stored.id);

        return NextResponse.json({
            lifetimeTable: scrapedData,
            source: 'scraped',
            year: currentYear,
            lastUpdated: new Date().toISOString()
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
            }
        });
    } catch (error) {
        console.error("❌ Error in GET route:", error);
        return NextResponse.json(
            { error: "An error occurred while processing the RMD table." },
            { status: 500 }
        );
    }
}
