// Pure layout utilities — no React, no framework coupling.

export interface GridItem {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface GridPosition {
    x: number;
    y: number;
}

/**
 * Ported verbatim from falcon-ui/src/tabs/ordercalculation.ts (T1.3).
 *
 * Finds the first available (x, y) position in a react-grid-layout grid
 * that can fit a widget of the given dimensions without overlapping any
 * existing item. Scans left-to-right, top-to-bottom.
 *
 * @param existingItems  Current items on the grid (each with x, y, w, h).
 * @param newItemWidth   Width of the widget to place, in grid columns.
 * @param newItemHeight  Height of the widget to place, in grid rows.
 * @param gridWidth      Total column count of the grid (default 12).
 * @returns              {x, y} of the top-left cell for the new widget.
 */
export function findBestFitPosition(
    existingItems: GridItem[],
    newItemWidth: number,
    newItemHeight: number,
    gridWidth: number = 12,
): GridPosition {
    if (existingItems.length === 0) {
        return { x: 0, y: 0 };
    }

    const occupied = new Set<string>();
    let maxY = 0;

    for (const { x, y, w, h } of existingItems) {
        for (let i = x; i < x + w; i++) {
            for (let j = y; j < y + h; j++) {
                occupied.add(`${i},${j}`);
                if (j > maxY) maxY = j;
            }
        }
    }

    for (let y = 0; y <= maxY + 1; y++) {
        for (let x = 0; x <= gridWidth - newItemWidth; x++) {
            let fits = true;
            outer: for (let i = x; i < x + newItemWidth; i++) {
                for (let j = y; j < y + newItemHeight; j++) {
                    if (occupied.has(`${i},${j}`)) {
                        fits = false;
                        break outer;
                    }
                }
            }
            if (fits) return { x, y };
        }
    }

    return { x: 0, y: maxY + 1 };
}