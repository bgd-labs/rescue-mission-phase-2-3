import fs from 'fs';
import {amountsFilePath} from '../js-scripts/common/constants';
import {generateMainnetTokensMap} from './generate-mainnet-token-maps';
import {
  generatePolTokensMap,
  generateAvaTokensMap,
  generateOptTokensMap,
  generateArbTokensMap,
  generateFanTokensMap,
} from './generate-l2-token-maps';

// Phase 2, 3
async function phase_2_3() {
  fs.appendFileSync(
    amountsFilePath,
    `Last run: ${new Date().toUTCString()} Network: ${process.env.network}`
  );
  if (process.env.network === 'mainnet') {
    await generateMainnetTokensMap();
  } else if (process.env.network === 'l2') {
    await generatePolTokensMap();
    await generateAvaTokensMap();
    await generateArbTokensMap();
    await generateOptTokensMap();
    await generateFanTokensMap();
  }
  fs.appendFileSync(amountsFilePath, '\n');
}

phase_2_3();
