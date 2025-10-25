import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RideRequestForm from '../components/RideRequestForm.jsx';
import client from '../api/httpClient.js';
import { searchAddress, reverseGeocode } from '../api/geocoding.js';

jest.mock('../api/httpClient.js');
jest.mock('../api/geocoding.js', () => ({
  __esModule: true,
  searchAddress: jest.fn(),
  reverseGeocode: jest.fn()
}));
jest.mock('../components/MapPreview.jsx', () => ({
  __esModule: true,
  default: ({ pickup, dropoff }) => (
    <div data-testid="map-preview" data-pickup={pickup ? `${pickup.lat},${pickup.lng}` : ''} data-dropoff={dropoff ? `${dropoff.lat},${dropoff.lng}` : ''} />
  )
}));

const onSuccess = jest.fn();

describe('RideRequestForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.post.mockResolvedValue({
      data: {
        pickup: { address: 'Echo Park', lat: 34.07, lng: -118.26 },
        dropoff: { address: 'Silverlake', lat: 34.09, lng: -118.28 }
      }
    });
    reverseGeocode.mockResolvedValue(null);
  });

  it('submits ride data after selecting address suggestions', async () => {
    searchAddress.mockResolvedValueOnce([
      {
        id: 'pickup-1',
        placeName: 'Echo Park',
        coordinates: { lat: 34.07, lng: -118.26 }
      }
    ]);
    searchAddress.mockResolvedValueOnce([
      {
        id: 'dropoff-1',
        placeName: 'Silverlake',
        coordinates: { lat: 34.09, lng: -118.28 }
      }
    ]);

    render(<RideRequestForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/Search pickup address/i), {
      target: { value: 'Echo Park' }
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Echo Park/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Echo Park/i }));

    fireEvent.change(screen.getByPlaceholderText(/Search dropoff address/i), {
      target: { value: 'Silverlake' }
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Silverlake/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Silverlake/i }));

    fireEvent.click(screen.getByRole('button', { name: /Get Help Now/i }));

    await waitFor(() => expect(client.post).toHaveBeenCalledWith(
      '/rides',
      expect.objectContaining({
        pickup: expect.objectContaining({
          address: 'Echo Park',
          lat: 34.07,
          lng: -118.26
        }),
        dropoff: expect.objectContaining({
          address: 'Silverlake',
          lat: 34.09,
          lng: -118.28
        })
      })
    ));

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        pickup: expect.objectContaining({ address: 'Echo Park' }),
        dropoff: expect.objectContaining({ address: 'Silverlake' })
      })
    );
  });

  it('shows validation errors when coordinates are missing', async () => {
    searchAddress.mockResolvedValue([]);

    render(<RideRequestForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/Search pickup address/i), {
      target: { value: 'Unknown Pickup' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Search dropoff address/i), {
      target: { value: 'Unknown Dropoff' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Get Help Now/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Pickup location must include valid coordinates/i);
    expect(client.post).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
