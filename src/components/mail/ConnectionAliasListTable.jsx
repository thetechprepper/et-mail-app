import { useMemo, useState } from "react";
import {
  Button,
  Cell,
  Column,
  Flex,
  Heading,
  TableBody,
  TableHeader,
  TableView,
  ToastQueue,
  Row,
  Text,
  View
} from "@adobe/react-spectrum";
import WorkflowRunner from "../common/WorkflowRunner";
import StationPicker from "../connect/StationPicker";

export default function ConnectionAliasListTable() {
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

  const [selectedUri, setSelectedUri] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [selectedStation, setSelectedStation] = useState(null);

  // Phase A - Allow the user to select the method for selecting a station
  // TODO: Replace KT7RUN with current et-user callsign
  const methods = [
    {
      key: "telnet",
      label: "Telnet (Requires Internet Access)",
      opensDialog: false,
      onSelect: () => ({
        name: "Telnet",
        transport: "telnet",
        bandwidth: "",
        target: "wl2k",
        frequency: 0,
        uri: "telnet://KT7RUN:CMSTelnet@cms.winlink.org:8772/wl2k",
        address: "KT7RUN:CMSTelnet@cms.winlink.org:8772"
      })
    },
    {
      key: "alias",
      label: "Alias/Favorites",
      render: ({ onPick }) => (
        <Text>Alias selector goes here</Text>
      )
    },
    {
      key: "manual",
      label: "Manual entry",
      render: ({ onPick }) => (
        <Text>Manual entry goes here</Text>
      )
    }
  ];


  const [runSignal, setRunSignal] = useState(0);

  const steps = useMemo(() => [
    {
      id: "connect",
      description: "Connect to station",
      run: async ({ selectedUri }) => {
        const encoded = encodeURIComponent(selectedUri);
        const url = `http://localhost:8080/api/connect?url=${encoded}`;

        const res = await fetch(url, { method: "GET" });
        if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };

        const data = await res.json();
        const num = typeof data?.NumReceived === "number" ? data.NumReceived : 0;

        return { ok: true, detail: `${num} messages received` };
      }
    },
    {
      id: "refreshInbox",
      description: "Refresh inbox list",
      run: async () => {
        // Example: call your inbox endpoint so UI can refresh
        // Replace with your actual endpoint or remove if not needed.
        const res = await fetch("http://localhost:8080/api/mailbox/in");
        if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
        return { ok: true, detail: "Inbox refreshed" };
      }
    }
  ], []);


  const selectedKeys = selectedUri ? new Set([selectedUri]) : new Set();

  const selectedAlias = selectedUri
    ? aliases.find((a) => a.uri === selectedUri)
    : null;

  const handleSelectionChange = (keys) => {
    if (keys === "all") return;

    const first = keys && keys.size ? Array.from(keys)[0] : null;
    setSelectedUri(first || null);
  };

  const handleConnect = async () => {
    if (!selectedUri) return;
    setRunSignal((n) => n + 1);
  };

  return (
    <View>

      <StationPicker
        methods={methods}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
      />

      <Heading level={3}>Current Station</Heading>

      {selectedUri && (
        <View>
	  <Button variant="cta" onPress={handleConnect} isPending={isConnecting}>
            Connect to {selectedAlias ? selectedAlias.name : ""}
          </Button>

        </View>
      )}

      <WorkflowRunner
        steps={steps}
        context={{ selectedUri }}
        runSignal={runSignal}
      />

      <Heading level={3}>Favorite Stations</Heading>

      <TableView
        aria-label="Connection aliases"
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
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
    </View>
  );
}

function formatFrequencyMHz(freqHz) {
  if (!freqHz || typeof freqHz !== "number") {
    return "";
  }
  return `${(freqHz / 1000000).toFixed(5)} MHz`;
}

