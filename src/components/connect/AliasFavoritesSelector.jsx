import React, { useState } from "react";
import {
  Button,
  Cell,
  Column,
  Flex,
  TableBody,
  TableHeader,
  TableView,
  Row,
  Text,
  View
} from "@adobe/react-spectrum";

export default function AliasFavoritesSelector({
  aliases,
  onPick
}) {
  const [selectedUri, setSelectedUri] = useState(null);

  const selectedKeys = selectedUri ? new Set([selectedUri]) : new Set();

  const handleSelectionChange = (keys) => {
    if (keys === "all") return;
    const first = keys && keys.size ? Array.from(keys)[0] : null;
    setSelectedUri(first || null);
  };

  const selectedAlias =
    selectedUri ? (aliases || []).find((a) => a.uri === selectedUri) : null;

  return (
    <View>
      <Text>Select a station from your favorites.</Text>

      <View marginTop="size-200">
        <TableView
          aria-label="Favorite stations"
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

          <TableBody items={aliases || []}>
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
            onPress={() => selectedAlias && onPick(selectedAlias)}
            isDisabled={!selectedAlias}
          >
            Use selected
          </Button>

          {selectedAlias && (
            <Text>Current selection: {selectedAlias.uri}</Text>
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
