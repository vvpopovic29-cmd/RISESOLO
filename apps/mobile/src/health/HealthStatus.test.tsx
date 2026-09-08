import { render, screen, waitFor } from "@testing-library/react-native";
import { createApiClient } from "@risesolo/api-client";
import { HealthStatus } from "./HealthStatus";

jest.mock("@risesolo/api-client", () => ({
  ApiError: class ApiError extends Error {},
  createApiClient: jest.fn(),
}));

const mockedCreateApiClient = createApiClient as jest.Mock;

describe("HealthStatus", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje loading stanje pre nego sto se zahtev zavrsi", async () => {
    mockedCreateApiClient.mockReturnValue({ getHealth: () => new Promise(() => {}) });

    render(<HealthStatus />);

    await waitFor(() => expect(screen.getByText(/Proveravam API konekciju/i)).toBeTruthy());
  });

  it("prikazuje success stanje kada je API dostupan", async () => {
    mockedCreateApiClient.mockReturnValue({
      getHealth: () =>
        Promise.resolve({ status: "ok", uptimeSeconds: 42, timestamp: new Date().toISOString() }),
    });

    render(<HealthStatus />);

    await waitFor(() => expect(screen.getByText(/API je dostupan/i)).toBeTruthy());
  });

  it("prikazuje error stanje i dugme za ponovni pokusaj kada API poziv ne uspe", async () => {
    mockedCreateApiClient.mockReturnValue({
      getHealth: () => Promise.reject(new Error("mreza nedostupna")),
    });

    render(<HealthStatus />);

    await waitFor(() => expect(screen.getByText(/API nije dostupan/i)).toBeTruthy());
    expect(screen.getByText(/Pokusaj ponovo/i)).toBeTruthy();
  });
});
