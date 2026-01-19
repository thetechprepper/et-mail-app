import React, { useMemo, useState } from "react";
import {
  Button,
  Cell,
  Column,
  Flex,
  Item,
  Picker,
  TableBody,
  TableHeader,
  TableView,
  Row,
  Text,
  View
} from "@adobe/react-spectrum";

export default function FindNearSelector({
  results,
  onPick
}) {
  // "results" is expected to be an array of station-like objects.
  // For now this is a stub. You will tell me later how these are loaded
  // and what "near" inputs you want (GPS, grid, radius, etc.).

  const [selectedUri, setSelectedUri] = useState(null);

  const selectedKeys = selectedUri ? new Set([selectedUri]) : new Set();

  const handleSelectionChange = (keys) => {
    if (keys === "all") return;
    const first = keys && keys.size ? Array.from(keys)[0] : null;
    setSelectedUri(first || null);
  };

  const selectedStation =
    selectedUri ? (results || []).find((s) => s.uri === selectedUri) : null;

  const defaultNear = useMemo(
    () => ({
      mode: "gps",          // gps | grid | manual
      radiusMiles: 25,
      grid: "",
      lat: "",
      lon: ""
    }),
    []
  );

  const [near, setNear] = useState(defaultNear);

  return (
    <View>
      <Text>Select a station near you (stub).</Text>

      <View marginTop="size-200">
        <Picker
          label="Find near"
          selectedKey={near.mode}
          onSelectionChange={(key) =>
            setNear((prev) => ({ ...prev, mode: String(key) }))
          }
        >
          <Item key="gps">Current GPS Position</Item>
          <Item key="grid">My Grid Square</Item>
          <Item key="manual">Manual Lat/Lon</Item>
        </Picker>
      </View>

      <View marginTop="size-200">
        <Text>
          Mode: {near.mode}, Radius: {String(near.radiusMiles)} miles
        </Text>
      </View>

      <View marginTop="size-200">
        <TableView
          aria-label="Nearby stations"
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

          <TableBody items={results || []}>
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

      <View marginTop="size-200">
        <Flex direction="row" gap="size-200" alignItems="center">
          <Button
            variant="cta"
            onPress={() => selectedStation && onPick(selectedStation)}
            isDisabled={!selectedStation}
          >
            Use selected
          </Button>

          {selectedStation && (
            <Text>Current selection: {selectedStation.uri}</Text>
          )}
        </Flex>
      </View>
    </View>
  );
}

function formatFrequencyMHz(freqHz) {
  if (!freqHz || typeof freqHz !== "number") {
    return "";
  }
  return `${(freqHz / 1000000).toFixed(5)} MHz`;
}
