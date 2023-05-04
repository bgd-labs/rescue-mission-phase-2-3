import aRaiRescueMap from './maps/aRaiRescueMap.json';
import { parseBalanceMap } from './parse-balance-map';
import fs from 'fs';

// phase 2
const raiPath = `./js-scripts/maps/aRaiRescueMerkleTree.json`;
fs.writeFileSync(
  raiPath,
  JSON.stringify(parseBalanceMap(aRaiRescueMap, 18, 'aRAI')),
);
