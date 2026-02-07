export const GET_STATION_DETAILS = `
  query GetStationDetails($stationId: String!) {
    ChargingStations(where: { id: { _eq: $stationId } }) {
      id
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      updatedAt
    }
    Connectors(where: { stationId: { _eq: $stationId } }) {
      id
      connectorId
      status
      errorCode
      timestamp
      type
    }
    VariableAttributes(where: { stationId: { _eq: $stationId } }) {
      value
      generatedAt
      variableId
    }
    Variables {
      id
      name
    }
    Transactions(where: { stationId: { _eq: $stationId }, isActive: { _eq: true } }, limit: 1, order_by: { id: desc }) {
      transactionId
    }
  }
`;

export const GET_ALL_STATIONS = `
  query GetAllStations {
    ChargingStations(order_by: { updatedAt: desc }) {
      id
      isOnline
      protocol
      chargePointVendor
      chargePointModel
      locationId
    }
  }
`;
