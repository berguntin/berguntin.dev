// Comprueba que el campo de regatas se puede fondear en agua para cualquier viento.
// Uso: pnpm check:course
import { readFileSync } from 'node:fs';

const { buildCourse, courseLengthMiles, makeWaterTest, parseRings } = await import('../src/scripts/regatta-course.ts');
const chart = JSON.parse(readFileSync(new URL('../src/data/ria-coruna.json', import.meta.url), 'utf8'));
const seaChart = readFileSync(new URL('../src/components/SeaChart.astro', import.meta.url), 'utf8');

// Mismos datos que usa la página: se leen del componente para que no se desincronicen.
const point = /const harbour: \[number, number\] = (\[[^\]]+\]);/.exec(seaChart);
const list = /const courseCenters: \[number, number\]\[\] = (\[[\s\S]*?\]);/.exec(seaChart);
if (!point || !list) throw new Error('No encuentro harbour o courseCenters en SeaChart.astro');
const harbour = JSON.parse(point[1]);
const centers = JSON.parse(list[1].replace(/,\s*\]/g, ']'));

const [S, , N] = chart.bbox;
const unitsPerMile = chart.height / ((N - S) * 60);
const isWater = makeWaterTest(parseRings(chart.land), [chart.width, chart.height]);

let failed = 0;
let shortened = 0;
for (const speed of [0, 4, 8, 12, 16, 20, 30]) {
  for (let direction = 0; direction < 360; direction += 2) {
    const course = buildCourse({ windFrom: direction, windSpeed: speed, centers, harbour, unitsPerMile, isWater });
    if (!course) {
      failed++;
      console.error(`Sin campo para ${direction}° y ${speed} kn`);
    } else if (course.lengthMiles < courseLengthMiles(speed) - 0.01) {
      shortened++;
    }
  }
}
console.log(`Campos comprobados: ${7 * 180}. Sin campo: ${failed}. Acortados por la costa: ${shortened}.`);
process.exit(failed ? 1 : 0);
