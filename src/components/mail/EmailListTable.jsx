import { useEffect, useState } from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Picker,
  Item,
  View
} from "@adobe/react-spectrum";

const MAILBOX_ENDPOINTS = {
  inbox: "http://localhost:8080/api/mailbox/in",
  outbox: "http://localhost:8080/api/mailbox/out",
  sent: "http://localhost:8080/api/mailbox/sent",
  archived: "http://localhost:8080/api/mailbox/archive"
};

export default function EmailListTable() {
  const [mailbox, setMailbox] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSent = mailbox === "sent";

  useEffect(() => {
    setLoading(true);

    fetch(MAILBOX_ENDPOINTS[mailbox])
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
  }, [mailbox]);

  return (
    <View>
      <Picker
        label="Mailbox"
        selectedKey={mailbox}
        onSelectionChange={setMailbox}
        width="size-2000"
      >
        <Item key="inbox">Inbox</Item>
        <Item key="outbox">Outbox</Item>
        <Item key="sent">Sent</Item>
        <Item key="archived">Archived</Item>
      </Picker>

      <TableView
        aria-label="Email list"
        selectionMode="single"
        isQuiet
        marginTop="size-200"
      >
        <TableHeader>
          <Column key="fromTo">
            {isSent ? "To" : "From"}
          </Column>
          <Column key="subject">Subject</Column>
          <Column key="date">Date</Column>
        </TableHeader>

        <TableBody
          items={messages}
          loadingState={loading ? "loading" : "idle"}
        >
          {(item) => (
            <Row key={item.MID}>
              <Cell>
                {isSent
                  ? item.To?.[0]?.Addr || ""
                  : item.From?.Addr || ""}
              </Cell>
              <Cell>{item.Subject || ""}</Cell>
              <Cell>{item.Date || ""}</Cell>
            </Row>
          )}
        </TableBody>
      </TableView>
    </View>
  );
}
