import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';

import { MouseEventHandler } from 'react';
import './Request.scss';

interface Props {
  close?: MouseEventHandler;
  completed?: boolean;
  header: string;
  children?: React.ReactNode;
}

const Request = ({ close, header, completed, children }: Props) => {
  return (
    <div className="Request">
      <div className="RequestSummary">
        <div className="RequestHeader">
          <h6>{header}</h6>
        </div>
        {completed && (
          <IconButton onClick={close} size="medium">
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <div className="Body">{children}</div>

      {completed && <div className="Overlay" />}
    </div>
  );
};

export default Request;
