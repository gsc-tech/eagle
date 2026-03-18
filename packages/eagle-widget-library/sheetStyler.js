/**
 * sheetStyler.js
 * ──────────────
 * A script to modify the Univer sheet template with custom themes, 
 * improved legibility, and conditional formatting.
 * 
 * Usage: node sheetStyler.js [themeName]
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'sheetTemplate.json');

// ─── Theme Configurations ───────────────────────────────────────────────────
// Modify these variables to change the look and feel.
const THEMES = {
    "Professional": {
        name: "Professional Light",
        posText: "rgb(29, 78, 216)",    // Blue 700
        posBg: "rgb(219, 234, 254)",     // Blue 100
        negText: "rgb(194, 65, 12)",     // Orange 700
        negBg: "rgb(255, 237, 213)",     // Orange 100
        mismatchText: "rgb(255, 255, 255)", 
        mismatchBg: "rgb(55, 65, 81)",   // Slate 700
        headerText: "rgb(17, 24, 39)",
        headerBg: "rgb(243, 244, 246)",
        border: "rgb(209, 213, 219)",
        fontFamily: "Inter, 'Segoe UI', sans-serif"
    },
    "Ocean": {
        name: "Ocean breeze",
        posText: "rgb(12, 74, 110)",    // Sky 900
        posBg: "rgb(224, 242, 254)",     // Sky 100
        negText: "rgb(154, 52, 18)",    // Orange 800
        negBg: "rgb(255, 247, 237)",     // Orange 50
        mismatchText: "rgb(255, 255, 255)",
        mismatchBg: "rgb(8, 145, 178)",  // Cyan 600
        headerText: "rgb(12, 74, 110)",
        headerBg: "rgb(240, 249, 255)",
        border: "rgb(186, 230, 253)",
        fontFamily: "Inter, sans-serif"
    },
    "HighContrast": {
        name: "High Contrast",
        posText: "rgb(0, 0, 0)",
        posBg: "rgb(186, 230, 253)",     // Strong Blue
        negText: "rgb(0, 0, 0)",
        negBg: "rgb(254, 215, 170)",     // Strong Orange
        mismatchText: "rgb(255, 255, 255)",
        mismatchBg: "rgb(0, 0, 0)",      // Black
        headerText: "rgb(0, 0, 0)",
        headerBg: "rgb(209, 213, 219)",
        border: "rgb(0, 0, 0)",
        fontFamily: "Arial, sans-serif"
    },
    "Terminal": {
        name: "Modern Terminal",
        posText: "rgb(6, 95, 70)",       // Emerald 800
        posBg: "rgb(236, 253, 245)",     // Emerald 50
        negText: "rgb(153, 27, 27)",     // Red 800
        negBg: "rgb(254, 242, 242)",     // Red 50
        mismatchText: "rgb(255, 255, 255)",
        mismatchBg: "rgb(31, 41, 55)",   // Gray 800
        headerText: "rgb(255, 255, 255)",
        headerBg: "rgb(17, 24, 39)",      // Gray 900
        border: "rgb(55, 65, 81)",       // Gray 700
        fontFamily: "'Courier New', monospace"
    },
    "SleekNeutral": {
        name: "Sleek Neutral",
        posText: "rgb(30, 64, 175)",     // Blue 800
        posBg: "rgb(239, 246, 255)",     // Blue 50
        negText: "rgb(154, 52, 18)",     // Orange 800
        negBg: "rgb(255, 247, 237)",     // Orange 50
        mismatchText: "rgb(17, 24, 39)",
        mismatchBg: "rgb(253, 224, 71)",  // Yellow 300
        headerText: "rgb(255, 255, 255)",
        headerBg: "rgb(71, 85, 105)",    // Slate 600
        border: "rgb(203, 213, 225)",    // Slate 200
        fontFamily: "Inter, system-ui, sans-serif"
    },
    "DarkSlate": {
        name: "Dark Slate Professional",
        posText: "rgb(2, 132, 199)",     // Sky 600
        posBg: "rgb(240, 249, 255)",     // Sky 50
        negText: "rgb(234, 88, 12)",     // Orange 600
        negBg: "rgb(255, 247, 237)",     // Orange 50
        mismatchText: "rgb(255, 255, 255)",
        mismatchBg: "rgb(15, 23, 42)",   // Slate 900
        headerText: "rgb(248, 250, 252)", // Slate 50
        headerBg: "rgb(30, 41, 59)",     // Slate 800
        border: "rgb(226, 232, 240)",    // Slate 200
        fontFamily: "Inter, sans-serif"
    }
};

const DEFAULT_THEME = "SleekNeutral";

function applyTheme(template, themeName) {
    const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];
    console.log(`Applying theme: ${theme.name}...`);

    // 1. Inject/Update Named Styles
    // We create fixed keys for our theme styles so they are easy to reference.
    const newStyles = {
        "STYLE_POS": {
            "ff": theme.fontFamily,
            "fs": 10,
            "bl": 1,
            "cl": { "rgb": theme.posText },
            "bg": { "rgb": theme.posBg },
            "ht": 2, "vt": 2, "tb": 1,
            "bd": {
                "l": { "s": 1, "cl": { "rgb": theme.border } },
                "r": { "s": 1, "cl": { "rgb": theme.border } },
                "t": { "s": 1, "cl": { "rgb": theme.border } },
                "b": { "s": 1, "cl": { "rgb": theme.border } }
            }
        },
        "STYLE_NEG": {
            "ff": theme.fontFamily,
            "fs": 10,
            "bl": 1,
            "cl": { "rgb": theme.negText },
            "bg": { "rgb": theme.negBg },
            "ht": 2, "vt": 2, "tb": 1,
            "bd": {
                "l": { "s": 1, "cl": { "rgb": theme.border } },
                "r": { "s": 1, "cl": { "rgb": theme.border } },
                "t": { "s": 1, "cl": { "rgb": theme.border } },
                "b": { "s": 1, "cl": { "rgb": theme.border } }
            }
        },
        "STYLE_MISMATCH_POP": {
            "ff": theme.fontFamily,
            "fs": 11,
            "bl": 1,
            "cl": { "rgb": theme.mismatchText },
            "bg": { "rgb": theme.mismatchBg },
            "ht": 2, "vt": 2, "tb": 1,
            "bd": {
                "l": { "s": 2, "cl": { "rgb": "#000000" } }, // Thicker borders
                "r": { "s": 2, "cl": { "rgb": "#000000" } },
                "t": { "s": 1, "cl": { "rgb": "#000000" } },
                "b": { "s": 1, "cl": { "rgb": "#000000" } }
            }
        },
        "STYLE_HEADER": {
            "ff": theme.fontFamily,
            "fs": 10,
            "bl": 1,
            "cl": { "rgb": theme.headerText },
            "bg": { "rgb": theme.headerBg },
            "ht": 2, "vt": 2, "tb": 1,
            "bd": {
                "b": { "s": 2, "cl": { "rgb": theme.border } }
            }
        },
        "STYLE_BODY": {
            "ff": theme.fontFamily,
            "fs": 10,
            "cl": { "rgb": "rgb(17, 24, 39)" }, // Ensure dark text for body
            "bg": { "rgb": "rgb(255, 255, 255)" },
            "ht": 2, "vt": 2, "tb": 1,
            "bd": {
                "r": { "s": 1, "cl": { "rgb": theme.border } },
                "b": { "s": 1, "cl": { "rgb": theme.border } }
            }
        }
    };

    // Merge new styles into the template
    template.styles = { ...template.styles, ...newStyles };

    // 2. Identify and Update the Sheet Data
    const sheetsMap = template.sheets || {};
    const sheetKey = Object.keys(sheetsMap)[0];
    const sheet = sheetsMap[sheetKey];

    if (!sheet) {
        console.error("No sheet found in template!");
        return;
    }

    // 3. Update Column Widths for better legibility
    const columnData = sheet.columnData || {};
    columnData["14"] = { w: 100, hd: 0 }; // Outright (O) - make it wider
    // Columns C-N (2-13)
    for (let i = 2; i <= 13; i++) {
        columnData[i.toString()] = { w: 55, hd: 0 };
    }
    sheet.columnData = columnData;

    // 4. Update Header and Body Styles
    if (sheet.cellData) {
        Object.keys(sheet.cellData).forEach(rowIdx => {
            const row = sheet.cellData[rowIdx];
            const isHeader = parseInt(rowIdx) < 2;

            if (row) {
                Object.keys(row).forEach(colIdx => {
                    if (isHeader) {
                        row[colIdx].s = "STYLE_HEADER";
                    } else if (colIdx === "14") {
                        row[colIdx].s = "STYLE_MISMATCH_POP";
                    } else {
                        row[colIdx].s = "STYLE_BODY";
                    }
                });
            }
        });
    }
    return template;
}

// ─── Main Execution ─────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const themeName = args[0] || DEFAULT_THEME;

    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error(`Template not found at ${TEMPLATE_PATH}`);
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        let template = JSON.parse(raw);

        const modified = applyTheme(template, themeName);

        const outputPath = path.join(__dirname, `sheetTemplate_${themeName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(modified, null, 4));

        console.log(`\nSuccessfully generated themed template: ${outputPath}`);
        console.log(`To use this template, update sheetBuilder.ts to import this file.`);
    } catch (err) {
        console.error("Error processing template:", err);
    }
}

main();
