import { useEffect, useState } from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell
} from "@adobe/react-spectrum";

export default function NWSForecastZonesListTable() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetch("http://localhost:1981/api/nws/forecast-zones")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch NWS forecast zones");
        }
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
      </TableHeader>

      <TableBody items={zones} loadingState={loading ? "loading" : "idle"}>
        {(item) => (
          <Row key={`${item.state || ""}-${item.zone || ""}-${item.county || ""}-${item.name || ""}`}>
            <Cell>{item.state || ""}</Cell>
            <Cell>{item.county || ""}</Cell>
            <Cell>{item.name || ""}</Cell>
            <Cell>{item.zone || ""}</Cell>
          </Row>
        )}
      </TableBody>
    </TableView>
  );
}
