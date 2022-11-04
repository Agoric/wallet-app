// @ts-check
import React from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';

import './Card.scss';

/**
 * The params for the Card component. If `header` is not provided, `helptip`
 * will not be rendered.
 * @typedef {{
 *  header?: JSX.Element | string;
 *  helptip?: JSX.Element | string;
 *  children: JSX.Element[];
 * }} CardParams
 */

const Card = (/** @type {CardParams} */ { children, header, helptip }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl);

  return (
    <div className="Card">
      {header && (
        <div className="Header">
          <h6>
            {header}
            {helptip && (
              <>
                <IconButton
                  // @ts-expect-error "font" is defined in index.jsx
                  color="font"
                  size="small"
                  aria-label="purses info"
                  onClick={handleClick}
                >
                  <InfoOutlined fontSize="inherit" />
                </IconButton>
                <Popover
                  open={isOpen}
                  anchorEl={anchorEl}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                >
                  <Box sx={{ p: 2, maxWidth: '480px' }}>{helptip}</Box>
                </Popover>
              </>
            )}
          </h6>
        </div>
      )}
      <div className="Content">{children}</div>
    </div>
  );
};

export default Card;
