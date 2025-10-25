import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RideRequestForm from '../components/RideRequestForm.jsx';
import client from '../api/httpClient.js';

jest.mock('../api/httpClient.js');

const onSuccess = jest.fn();

describe('RideRequestForm', () => {
  beforeEach(() => {
    client.post.mockResolvedValue({ data: { pickup: { address: 'Echo Park' }, dropoff: { address: 'Silverlake' } } });
  });

  it('submits ride data and calls onSuccess', async () => {
    render(<RideRequestForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Pickup Address/i), { target: { value: 'Echo Park' } });
    fireEvent.change(screen.getByLabelText(/Dropoff Address/i), { target: { value: 'Silverlake' } });
    fireEvent.change(screen.getByLabelText(/Pickup Latitude/i), { target: { value: '34.07' } });
    fireEvent.change(screen.getByLabelText(/Pickup Longitude/i), { target: { value: '-118.26' } });
    fireEvent.change(screen.getByLabelText(/Dropoff Latitude/i), { target: { value: '34.09' } });
    fireEvent.change(screen.getByLabelText(/Dropoff Longitude/i), { target: { value: '-118.28' } });

    fireEvent.click(screen.getByRole('button', { name: /Get Help Now/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
