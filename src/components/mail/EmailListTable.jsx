import { useEffect, useState } from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell
} from "@adobe/react-spectrum";

export default function EmailListTable() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8080/api/mailbox/in")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch mailbox");
        }
        return res.json();
      })
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setMessages([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <TableView
      aria-label="Email list"
      selectionMode="single"
      isQuiet
    >
      <TableHeader>
        <Column key="from">From</Column>
        <Column key="subject">Subject</Column>
        <Column key="date">Date</Column>
      </TableHeader>

      <TableBody
        items={messages}
        loadingState={loading ? "loading" : "idle"}
      >
        {(item) => (
          <Row key={item.MID}>
            <Cell>{item.From?.Addr || ""}</Cell>
            <Cell>{item.Subject || ""}</Cell>
            <Cell>{item.Date || ""}</Cell>
          </Row>
        )}
      </TableBody>
    </TableView>
  );
}
