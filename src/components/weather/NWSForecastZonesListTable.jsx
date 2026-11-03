
import { useEffect, useState } from "react";
import {
  Flex,
  View,
  Text,
  Divider,
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
        setZones(Array.isArray(data) ? data.slice(0, 1) : []);
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
    <View width="100%">
      {loading ? (
        <Text>Loading NWS weather zone...</Text>
      ) : zones.length === 0 ? (
        <Text>No NWS weather zone found.</Text>
      ) : (
        zones.map((item) => {
          const rowKey = makeRowKey(item);
          const isRequesting = requestingKey === rowKey;

          return (
            <View key={rowKey}>
              <Flex direction="column" gap="size-100">
                <Text><strong>State:</strong> {item.state || ""}</Text>
                <Text><strong>County:</strong> {item.county || ""}</Text>
                <Text><strong>Area:</strong> {item.name || ""}</Text>
                <Text><strong>Zone:</strong> {item.zone || ""}</Text>
              </Flex>

              <Divider size="S" marginTop="size-200" marginBottom="size-200" />

              <Flex direction="column" gap="size-150">
                <Flex alignItems="center" justifyContent="space-between" gap="size-100">
                  <Text>5-Day Weather Forecast</Text>
                  <Button
                    variant="cta"
                    onPress={() => handleRequest(item)}
                    isDisabled={!item?.state || !item?.zone}
                    isPending={isRequesting}
                  >
                    Request
                  </Button>
                </Flex>

                <Flex alignItems="center" justifyContent="space-between" gap="size-100">
                  <Text>Most Recent Flood Watch</Text>
                  <Button variant="cta" isDisabled>
                    Request
                  </Button>
                </Flex>

                <Flex alignItems="center" justifyContent="space-between" gap="size-100">
                  <Text>Most Recent Hurricane</Text>
                  <Button variant="cta" isDisabled>
                    Request
                  </Button>
                </Flex>
              </Flex>
            </View>
          );
        })
      )}
    </View>
  );
}
