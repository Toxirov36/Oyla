import { config } from 'dotenv';
import { createPrismaClient } from './client';
import { installInteractivePilot } from './interactive-pilot';
config({ quiet: true, override: false });
const db = createPrismaClient();
void installInteractivePilot(db)
  .then((report) => {
    if (report.missingCourses.length)
      throw new Error(`Pilot courses missing: ${report.missingCourses.join(', ')}`);
    console.log(JSON.stringify({ event: 'interactive_pilot_installed', ...report }));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Pilot installation failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
