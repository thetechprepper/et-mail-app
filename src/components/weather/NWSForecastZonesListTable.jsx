import { useEffect, useState } from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Button,
  ToastQueue
} from "@adobe/react-spectrum";


export default function NWSForecastZonesListTable() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optional: track per-row request state
  const [requestingKey, setRequestingKey] = useState(null);

  useEffect(() => {
    setLoading(true);

    fetch("http://localhost:1981/api/nws/forecast-zones")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch NWS forecast zones");
        return res.json();
      })
      .then((data) => {
        setZones(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setZones([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const makeRowKey = (item) =>
    `${item.state || ""}-${item.zone || ""}-${item.county || ""}-${item.name || ""}`;

  const handleRequest = async (item) => {
    const county = item?.county;
    const state = item?.state;
    const zone = item?.zone;

    if (!state || !zone) return;

    const rowKey = makeRowKey(item);
    setRequestingKey(rowKey);

    try {
      const params = new URLSearchParams();
      params.append("state", state);
      params.append("zone", zone);

      const res = await fetch(
        "http://localhost:1981/api/winlink/messages/weather/nws/forecast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      ToastQueue.positive(
        `Forecast request sent for ${county}, ${state} zone ${zone}`,
        { timeout: 5000 }
      );
    } catch (err) {
      console.error(err);

      ToastQueue.negative(
        "Failed to post forecast request to outbox",
        { timeout: 5000 }
      );
    } finally {
      setRequestingKey(null);
    }
  };

  return (
    <TableView
      aria-label="NWS forecast zones"
      selectionMode="single"
      isQuiet
      width="100%"
    >
      <TableHeader>
        <Column key="state">State</Column>
        <Column key="county">County</Column>
        <Column key="area">Area</Column>
        <Column key="zone">Zone</Column>
        <Column key="action">Action</Column>
      </TableHeader>

      <TableBody items={zones} loadingState={loading ? "loading" : "idle"}>
        {(item) => {
          const rowKey = makeRowKey(item);
          const isRequesting = requestingKey === rowKey;

          return (
            <Row key={rowKey}>
              <Cell>{item.state || ""}</Cell>
              <Cell>{item.county || ""}</Cell>
              <Cell>{item.name || ""}</Cell>
              <Cell>{item.zone || ""}</Cell>
              <Cell>
                <Button
                  variant="cta"
                  onPress={() => handleRequest(item)}
                  isDisabled={!item?.state || !item?.zone}
                  isPending={isRequesting}
                >
                  Request
                </Button>
              </Cell>
            </Row>
          );
        }}
      </TableBody>
    </TableView>
  );
}
