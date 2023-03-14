import PetnameSpan from './PetnameSpan';
import PurseValue from './PurseValue';
import BrandIcon from './BrandIcon';

import type { AdditionalDisplayInfo } from '@agoric/ertp/src/types';
import type { Petname } from '@agoric/smart-wallet/src/types';

interface Props {
  brandPetname: Petname;
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
        <PetnameSpan name={pursePetname} />
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
