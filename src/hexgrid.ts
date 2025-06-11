export function generateGridCenters(
    containerWidth: number,
    containerHeight: number,
    size: number,
    overflow: number
) {
    const hexHeight = size * 2.0;
    const hexWidth = Math.sqrt(3) * size;
    const verticalSpacing = (hexHeight * 3.0) / 4.0;
    const horizontalSpacing = hexWidth;

    const columns = Math.ceil(containerWidth / horizontalSpacing);
    const rows = Math.ceil(containerHeight / verticalSpacing);

    const centersX = [];
    const centersY = [];
    const offset = (horizontalSpacing / 2.0 / containerWidth) * 100;

    for (let col = 0; col <= columns; col++) {
        const cx = ((col * horizontalSpacing) / containerWidth) * 100;
        centersX.push(cx);
    }

    // const adjustedCentersX = [];
    // for (let i = 0; i < centersX.length; i++) {
    //     const cx =
    //         centersX[i] + (horizontalSpacing / 2.0 / containerWidth) * 100;
    //     adjustedCentersX.push(cx);
    // }
    // centersX.push(...adjustedCentersX);

    for (let row = 0; row <= rows; row++) {
        const cy = ((row * verticalSpacing) / containerHeight) * 100;
        centersY.push(cy);
    }

    return { x: centersX, y: centersY, offset: offset };
}
