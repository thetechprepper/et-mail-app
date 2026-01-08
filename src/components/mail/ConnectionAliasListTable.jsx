import { useMemo } from "react";
import {
  Cell,
  Column,
  Heading,
  TableBody,
  TableHeader,
  TableView,
  Row
} from "@adobe/react-spectrum";

export default function ConnectionAliasListTable() {
  // Stub model. Replace or hydrate later.
  const aliases = useMemo(
    () => [
      {
        name: "Telnet",
        transport: "telnet",
        bandwidth: "",
        target: "wl2k",
	frequency: 0,
        uri: "telnet://KT7RUN:CMSTelnet@cms.winlink.org:8772/wl2k",
        address: "KT7RUN:CMSTelnet@cms.winlink.org:8772"
      },
      {
        name: "VHF Packet 1",
        transport: "ax25",
        bandwidth: "",
        target: "KT7RUN-10",
	frequency: 145710000,
        uri: "ax25:///KT7RUN-10",
        address: ""
      },
      {
        name: "VHF Packet 2",
        transport: "ax25",
        bandwidth: "",
        target: "W7MOT-6/KE7EJF-10",
	frequency: 145710000,
        uri: "ax25:///W7MOT-6/KE7EJF-10",
        address: ""
      },
      {
        name: "Local 40m 1 (Day)",
        transport: "ardop",
	bandwidth: "500MAX",
        target: "N0DAJ",
	frequency: 7106530,
        uri: "ardop:///N0DAJ?bw=500MAX",
        address: ""
      },
      {
        name: "Local 40m 2 (Day)",
        transport: "varahf",
	bandwidth: "500",
        target: "N0DAJ",
	frequency: 7106530,
        uri: "varahf:///N0DAJ?bw=500",
        address: ""
      },
      {
        name: "Local 80m 1 (All Day)",
        transport: "ardop",
	bandwidth: "2000MAX",
        target: "N0DAJ",
	frequency: 3588500,
        uri: "ardop:///N0DAJ?bw=2000MAX",
        address: ""
      },
      {
        name: "Local 80m 2 (All Day)",
        transport: "varahf",
	bandwidth: "2750",
        target: "N0DAJ",
	frequency: 3588500,
        uri: "varahf:///N0DAJ?bw=2750",
        address: ""
      }
    ],
    []
  );

  return (
    <>
    <Heading level={3}>Favorite Stations</Heading>
    <TableView
      aria-label="Connection aliases"
      selectionMode="single"
      isQuiet
      width="100%"
    >
      <TableHeader>
        <Column key="name">Name</Column>
        <Column key="transport">Transport</Column>
        <Column key="bandwidth">Bandwidth</Column>
        <Column key="target">Target</Column>
        <Column key="frequency">Frequency</Column>
      </TableHeader>

      <TableBody items={aliases}>
        {(item) => (
          <Row key={item.uri}>
            <Cell>{item.name || ""}</Cell>
            <Cell>{item.transport || ""}</Cell>
            <Cell>{item.bandwidth || ""}</Cell>
            <Cell>{item.target || ""}</Cell>
            <Cell>{formatFrequencyMHz(item.frequency)}</Cell>
          </Row>
        )}
      </TableBody>
    </TableView>
    </>
  );
}

function formatFrequencyMHz(freqHz) {
  if (!freqHz || typeof freqHz !== "number") {
    return "";
  }

  return `${(freqHz / 1_000_000).toFixed(5)} MHz`;
}

