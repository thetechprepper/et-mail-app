import React, { useMemo, useState } from "react";
import {
  Button,
  Flex,
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

  return (
    <View>
      <Text>Enter station details. URI is required.</Text>

      <View marginTop="size-200">
        <Flex direction="column" gap="size-200">
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            width="100%"
          />

          <TextField
            label="Transport"
            value={transport}
            onChange={setTransport}
            width="100%"
          />

          <TextField
            label="Bandwidth"
            value={bandwidth}
            onChange={setBandwidth}
            width="100%"
          />

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
            value={uri}
            onChange={setUri}
            width="100%"
            isRequired
            validationState={uri ? "valid" : "invalid"}
          />

          <TextField
            label="Address"
            value={address}
            onChange={setAddress}
            width="100%"
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
