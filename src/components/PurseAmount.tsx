import Petname from './Petname';
import PurseValue from './PurseValue';
import BrandIcon from './BrandIcon';

import type { AdditionalDisplayInfo } from '@agoric/ertp/src/types';

interface Props {
  brandPetname: string;
  pursePetname: string;
  value: any;
  displayInfo: AdditionalDisplayInfo;
}

const PurseAmount = ({
  brandPetname,
  pursePetname,
  value,
  displayInfo,
}: Props) => {
  return (
    <div className="Amount">
      <BrandIcon brandPetname={brandPetname} />
      <div>
        <Petname name={pursePetname} />
        <PurseValue
          value={value}
          displayInfo={displayInfo}
          brandPetname={brandPetname}
        />
      </div>
    </div>
  );
};

export default PurseAmount;
