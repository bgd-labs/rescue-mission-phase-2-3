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

// Phase 2
async function phase2() {
  fs.writeFileSync(amountsFilePath, '');
  if (process.env.network === 'mainnet') {
    await generateMainnetTokensMap();
  } else if (process.env.network === 'l2') {
    await generatePolTokensMap();
    await generateAvaTokensMap();
    await generateArbTokensMap();
    await generateOptTokensMap();
    await generateFanTokensMap();
  }
}

phase2();
