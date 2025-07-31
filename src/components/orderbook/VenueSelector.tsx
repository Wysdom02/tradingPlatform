import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { RootState } from '@/store';
import { setVenue } from '@/store/orderbookSlice';
import './VenueSelector.scss';

type Venue = 'OKX' | 'Deribit';

const VENUES = [
  { value: 'OKX' as Venue, label: 'OKX Exchange' },
  { value: 'Deribit' as Venue, label: 'Deribit' },
] as const;

const VenueSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { venue } = useSelector((state: RootState) => state.orderbook);

  const handleVenueChange = (newVenue: Venue) => {
    if (newVenue !== venue) {
      dispatch(setVenue(newVenue));
    }
  };

  return (
    <div className="venue-selector">
      <FormControl 
        fullWidth 
        variant="outlined" 
        size="small"
        className="venue-selector__control"
      >
        <InputLabel>Trading Venue</InputLabel>
        <Select
          value={venue}
          onChange={(e) => handleVenueChange(e.target.value as Venue)}
          label="Trading Venue"
        >
          {VENUES.map((v) => (
            <MenuItem key={v.value} value={v.value}>
              {v.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default VenueSelector; 