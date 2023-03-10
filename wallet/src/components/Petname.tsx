import clsx from 'clsx';
import { wellKnownPetnames } from '../util/well-known-petnames';

import './Petname.scss';

const Petname = ({ name, plural = false, color = true }) => {
  if (Array.isArray(name)) {
    return (
      <span>
        {name[0]}
        <span className={clsx(color && 'Color', 'UntrustedName')}>
          {name.slice(1).map(chunk => `.${chunk}`)}
          {plural && 's'}
        </span>
      </span>
    );
  }

  return (
    <span>
      {wellKnownPetnames[name] ?? name}
      {plural && 's'}
    </span>
  );
};

export default Petname;
