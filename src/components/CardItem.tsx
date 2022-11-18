import { ReactNode } from 'react';
import './CardItem.scss';

interface Props {
  hideDivider?: boolean;
  children: ReactNode;
}

const CardItem = ({ children, hideDivider }: Props) => {
  return (
    <div className="CardItem">
      {hideDivider || <div className="Divider" />}
      {children}
    </div>
  );
};

export default CardItem;
