import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Flex,
  Item,
  Picker,
  Text,
  TextField,
  View
} from "@adobe/react-spectrum";

export default function ManualStationSelector({
  onPick
}) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState("");
  const [bandwidth, setBandwidth] = useState("");
  const [target, setTarget] = useState("");
  const [frequency, setFrequency] = useState("");
  const [uri, setUri] = useState("");
  const [address, setAddress] = useState("");

  const freqNumber = useMemo(() => {
    if (!frequency) return 0;
    const n = Number(frequency);
    return Number.isFinite(n) ? n : 0;
  }, [frequency]);

  const canPick = useMemo(() => {
    return !!uri;
  }, [uri]);

  const handlePick = () => {
    if (!onPick || !canPick) return;

    onPick({
      name: name || "",
      transport: transport || "",
      bandwidth: bandwidth || "",
      target: target || "",
      frequency: freqNumber || 0,
      uri: uri || "",
      address: address || ""
    });
  };

  useEffect(() => {
    const nextUri = buildUri(transport, target, bandwidth);
    setUri(nextUri);
  }, [transport, target, bandwidth]);

  useEffect(() => {
    if (transport !== "ardop" && transport !== "varahf") {
      setBandwidth("");
    }
  }, [transport]);

  const showBandwidth =
    transport === "ardop" || transport === "varahf";

  const bandwidthOptions = useMemo(() => {
    if (transport === "ardop") {
      return [
        "200MAX",
        "500MAX",
        "1000MAX",
        "2000MAX",
        "200FORCED",
        "500FORCED",
        "1000FORCED",
        "2000FORCED"
      ];
    }

    if (transport === "varahf") {
      return ["500", "2300", "2750"];
    }

    return [];
  }, [transport]);

  useEffect(() => {
    if (!showBandwidth) {
      setBandwidth("");
    }
  }, [showBandwidth]);

  return (
    <View>
      <View marginTop="size-200">
        <Flex direction="column" gap="size-200">
          <Picker
            label="Transport"
            selectedKey={transport}
            onSelectionChange={setTransport}
            width="100%"
          >
            <Item key="ardop">ardop</Item>
            <Item key="ax25">ax25</Item>
            <Item key="varafm">varafm</Item>
            <Item key="varahf">varahf</Item>
          </Picker>

          {showBandwidth && (
            <Picker
              label="Bandwidth"
              selectedKey={bandwidth}
              onSelectionChange={setBandwidth}
              width="100%"
            >
              {bandwidthOptions.map((bw) => (
                <Item key={bw}>{bw}</Item>
              ))}
            </Picker>
          )}

          <TextField
            label="Target"
            value={target}
            onChange={setTarget}
            width="100%"
          />

          <TextField
            label="Frequency (Hz)"
            value={frequency}
            onChange={setFrequency}
            width="100%"
          />

          <TextField
            label="URI"
	    isReadOnly
            value={uri}
            onChange={setUri}
            width="100%"
            isRequired
            validationState={uri ? "valid" : "invalid"}
          />

          <Button
            variant="cta"
            onPress={handlePick}
            isDisabled={!canPick}
          >
            Use this station
          </Button>
        </Flex>
      </View>
    </View>
  );
}

function buildUri(transport, target, bandwidth) {
  if (!transport || !target) {
    return "";
  }

  let uri = `${transport}:///${target}`;

  if (bandwidth) {
    uri += `?bw=${bandwidth}`;
  }

  return uri;
}
