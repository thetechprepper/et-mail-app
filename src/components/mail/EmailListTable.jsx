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
  View,
  DialogContainer,
  Dialog,
  Heading,
  Content,
  Divider,
  ProgressCircle,
  Text,
  ActionButton,
  Flex
} from "@adobe/react-spectrum";
import Close from "@spectrum-icons/workflow/Close";

const MAILBOX_ENDPOINTS = {
  inbox: "http://localhost:8080/api/mailbox/in",
  outbox: "http://localhost:8080/api/mailbox/out",
  sent: "http://localhost:8080/api/mailbox/sent",
  archived: "http://localhost:8080/api/mailbox/archive"
};

const MAILBOX_DETAIL_PATH = {
  inbox: "in",
  outbox: "out",
  sent: "sent",
  archived: "archive"
};

export default function EmailListTable() {
  const [mailbox, setMailbox] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSent = mailbox === "sent";

  // Dialog + message detail state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMid, setSelectedMid] = useState(null);
  const [messageDetail, setMessageDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

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

  useEffect(() => {
    if (!isDialogOpen || !selectedMid) return;

    const controller = new AbortController();

    setDetailLoading(true);
    setDetailError("");
    setMessageDetail(null);

    const detailPath = MAILBOX_DETAIL_PATH[mailbox];
    const url = `http://localhost:8080/api/mailbox/${detailPath}/${encodeURIComponent(
      selectedMid
    )}`;

    fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch message (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setMessageDetail(data);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error(err);
        setDetailError(err?.message || "Failed to fetch message");
      })
      .finally(() => {
        setDetailLoading(false);
      });

    return () => controller.abort();
  }, [isDialogOpen, selectedMid, mailbox]);

  function onAction(key) {
    setSelectedMid(String(key));
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setSelectedMid(null);
    setMessageDetail(null);
    setDetailError("");
    setDetailLoading(false);
  }

  const fromText = messageDetail?.From?.Addr || "";
  const toText = Array.isArray(messageDetail?.To)
    ? messageDetail.To.map((x) => x?.Addr).filter(Boolean).join(", ")
    : "";
  const subjectText = messageDetail?.Subject || "";
  const dateText = messageDetail?.Date || "";
  const bodyText = messageDetail?.Body || "";

  const subjectForHeading = subjectText && subjectText.trim() ? subjectText : "[No Subject]";

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
        selectionMode="none"
        isQuiet
        marginTop="size-200"
        onAction={onAction}
      >
        <TableHeader>
          <Column key="fromTo">{isSent ? "To" : "From"}</Column>
          <Column key="subject">Subject</Column>
          <Column key="date">Date</Column>
        </TableHeader>

        <TableBody items={messages} loadingState={loading ? "loading" : "idle"}>
          {(item) => {
            const isUnread = !!item.Unread;

            return (
              <Row key={item.MID}>
                <Cell>
                  <Text UNSAFE_style={{ fontWeight: isUnread ? 600 : 400 }}>
                    {isSent
                      ? item.To?.[0]?.Addr || ""
                      : item.From?.Addr || ""}
                  </Text>
                </Cell>
                <Cell>
                  <Text UNSAFE_style={{ fontWeight: isUnread ? 600 : 400 }}>
                    {item.Subject || ""}
                  </Text>
                </Cell>
                <Cell>
                  <Text UNSAFE_style={{ fontWeight: isUnread ? 600 : 400 }}>
                    {item.Date || ""}
                  </Text>
                </Cell>
              </Row>
            );
          }}
        </TableBody>
      </TableView>

      <DialogContainer onDismiss={closeDialog}>
        {isDialogOpen && (
          <Dialog width="75vw" maxWidth="1100px">
            <Heading>
              <span
                style={{
                  display: "block",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                title={subjectForHeading}
              >
                {subjectForHeading}
              </span>
            </Heading>

            <ActionButton
              isQuiet
              aria-label="Close"
              alignSelf="end"
              marginStart="auto"
              onPress={closeDialog}
            >
              <Close />
            </ActionButton>

            <Divider />

            <Content>
              {detailLoading && (
                <View>
                  <ProgressCircle aria-label="Loading message" isIndeterminate />
                </View>
              )}

              {!detailLoading && detailError && <Text>{detailError}</Text>}

              {!detailLoading && !detailError && messageDetail && (
                <View>
                  <View
                    UNSAFE_style={{
                      border: "1px solid var(--spectrum-global-color-gray-300)",
                      borderRadius: "8px",
                      padding: "12px"
                    }}
                  >
                    <Flex direction="column" gap="size-75">
                      <Flex gap="size-100" alignItems="baseline">
                        <Text UNSAFE_style={{ fontWeight: 600 }}>From:</Text>
                        <Text>{fromText}</Text>
                      </Flex>

                      <Flex gap="size-100" alignItems="baseline">
                        <Text UNSAFE_style={{ fontWeight: 600 }}>To:</Text>
                        <Text>{toText}</Text>
                      </Flex>

                      <Flex gap="size-100" alignItems="baseline">
                        <Text UNSAFE_style={{ fontWeight: 600 }}>
                          Subject:
                        </Text>
                        <Text>{subjectText || "[No Subject]"}</Text>
                      </Flex>

                      <Flex gap="size-100" alignItems="baseline">
                        <Text UNSAFE_style={{ fontWeight: 600 }}>Date:</Text>
                        <Text>{dateText}</Text>
                      </Flex>
                    </Flex>
                  </View>

                  <View
                    marginTop="size-200"
                    UNSAFE_style={{
                      padding: "12px",
                      border: "1px solid var(--spectrum-global-color-gray-300)",
                      borderRadius: "8px",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace"
                    }}
                  >
                    {bodyText || <Text>No body.</Text>}
                  </View>
                </View>
              )}
            </Content>
          </Dialog>
        )}
      </DialogContainer>
    </View>
  );
}
