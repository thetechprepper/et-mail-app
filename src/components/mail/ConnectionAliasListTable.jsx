import { useMemo, useState } from "react";
import {
  Button,
  ToastQueue,
  View
} from "@adobe/react-spectrum";
import WorkflowRunner from "../common/WorkflowRunner";
import StationPicker from "../connect/StationPicker";
import AliasFavoritesSelector from "../connect/AliasFavoritesSelector";
import ManualStationSelector from "../connect/ManualStationSelector";

export default function ConnectionAliasListTable() {
  const aliases = useMemo(
    () => [
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

  const [selectedStation, setSelectedStation] = useState(null);

  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [runSignal, setRunSignal] = useState(0);

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
      label: "Favorites",
      render: ({ onPick }) => (
        <AliasFavoritesSelector aliases={aliases} onPick={onPick} />
      )
    },
    {
      key: "manual",
      label: "Manual Entry",
      render: ({ onPick }) => (
        <ManualStationSelector onPick={onPick} />
      )
    }
  ];

  const handleConnect = () => {
    if (!selectedStation) return;

    const steps = buildConnectWorkflowSteps(selectedStation);
    setWorkflowSteps(steps);
    setRunSignal((n) => n + 1);
  };

  return (
    <View>
      <StationPicker
        methods={methods}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
        onSelectStation={(station) => {
          setSelectedStation(station);
          setWorkflowSteps([]);
        }}
      />

      {selectedStation && (
        <View>
          <Button variant="cta" onPress={handleConnect}>
            Connect to {selectedStation.name || ""}
          </Button>
        </View>
      )}

      {workflowSteps.length > 0 && (
        <WorkflowRunner steps={workflowSteps} runSignal={runSignal} />
      )}
    </View>
  );
}

  function buildConnectWorkflowSteps(station) {
    if (!station) return [];
  
    const transport = (station.transport || "").toLowerCase();
    const uri = station.uri || "";
    const freqHz = typeof station.frequency === "number" ? station.frequency : 0;

    // Telnet is a special case: go straight to connect
    if (transport === "telnet") {
      return [
        {
          id: "connect",
          description: "Connect via Telnet",
          run: async () => {
            const encoded = encodeURIComponent(uri);
            const url = `http://localhost:8080/api/connect?url=${encoded}`;

            const res = await fetch(url, { method: "GET" });
            if (!res.ok) {
              throw new Error(`Connect failed: ${res.status}`);
            }

            const data = await safeJson(res);
            const num = typeof data.NumReceived === "number" ? data.NumReceived : 0;

            ToastQueue.positive(
              `Connected. NumReceived=${num}`,
              { timeout: 5000 }
            );

            return { ok: true, detail: `NumReceived=${num}` };
          }
        }
      ];
    }

    const modeKey = mapTransportToModeKey(transport);

    return [
      {
        id: "stop-all",
        description: "Stop any running modes",
        run: async () => {
          const res = await fetch("http://localhost:8080/api/modes/all/stop", {
            method: "POST"
          });
          if (!res.ok) {
            throw new Error(`Stop all failed: ${res.status}`);
          }
          await safeJson(res);
          return { ok: true, detail: "Stopped" };
        }
      },
      {
        id: "start-mode",
        description: `Start ${transport}`,
        run: async () => {
          const res = await fetch(
            `http://localhost:8080/api/modes/winlink/${modeKey}/start`,
            { method: "POST" }
          );
          if (!res.ok) {
            throw new Error(`Start mode failed: ${res.status}`);
          }
          await safeJson(res);
          return { ok: true, detail: "Started" };
        }
      },
      {
        id: "qsy",
        description: "Optional: set radio frequency",
        allowFailure: true,
        run: async () => {
          const freqMHz = hzToMHz(freqHz);
          if (!freqMHz) {
            return { ok: true, detail: "Skipped (no frequency)" };
          }

          try {
            const res = await fetch("http://localhost:8080/api/qsy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transport, freq: freqMHz })
            });

            if (!res.ok) {
              return { ok: false, detail: `QSY failed: ${res.status}` };
            }

            await safeJson(res);
            return { ok: true, detail: `Set ${freqMHz} MHz` };
          } catch (err) {
            return {
              ok: false,
              detail: err && err.message ? err.message : "QSY failed"
          };
        }
      }
    },
    {
      id: "connect",
      description: "Connect to station",
      run: async () => {
        const encoded = encodeURIComponent(uri);
        const url = `http://localhost:8080/api/connect?url=${encoded}`;

        try {
          const res = await fetch(url, { method: "GET" });
          if (!res.ok) {
            throw new Error(`Connect failed: ${res.status}`);
          }

          const data = await safeJson(res);
          const num = typeof data.NumReceived === "number" ? data.NumReceived : 0;

          ToastQueue.positive(
            `Connected. NumReceived=${num}`,
            { timeout: 5000 }
          );

          return { ok: true, detail: `NumReceived=${num}` };
        } catch (err) {
          ToastQueue.negative(
              "Failed to connect",
              { timeout: 6000 }
            );
            throw err;
          }
        }
      }
    ];
  }

  function mapTransportToModeKey(transport) {
    // Matches API path: /api/modes/winlink/[ardop|ax25|varahf|varafm]/start
    if (transport === "varafm") return "varafm";
    if (transport === "varahf") return "varahf";
    if (transport === "ax25") return "ax25";
    if (transport === "ardop") return "ardop";
    return transport;
  }

  function hzToMHz(freqHz) {
    if (!freqHz || typeof freqHz !== "number") return 0;

    // If the number looks like Hz (145710000), convert to MHz (145.71)
    if (freqHz >= 1000000) {
      return Math.round((freqHz / 1000000) * 100) / 100;
    }

    // If the number already looks like MHz (145.71), keep it
    return Math.round(freqHz * 100) / 100;
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch (e) {
      return {};
  }
}
