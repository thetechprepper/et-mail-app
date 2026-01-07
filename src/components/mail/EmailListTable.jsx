import React from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell
} from "@adobe/react-spectrum";

const EMAILS = [
  {
    id: "1",
    subject: "Test message",
    from: "info@example.com",
    date: "2026-01-06"
  },
  {
    id: "2",
    subject: "System notification",
    from: "alerts@example.com",
    date: "2026-01-05"
  }
];

export default function EmailListTable() {
  return (
    <TableView
      aria-label="Email list"
      selectionMode="single"
      density="compact"
      width="100%"
    >
      <TableHeader>
        <Column key="subject" allowsResizing>
          Subject
        </Column>
        <Column key="from" allowsResizing>
          From
        </Column>
        <Column key="date" allowsResizing>
          Date
        </Column>
      </TableHeader>

      <TableBody items={EMAILS}>
        {(item) => (
          <Row key={item.id}>
            <Cell>{item.subject}</Cell>
            <Cell>{item.from}</Cell>
            <Cell>{item.date}</Cell>
          </Row>
        )}
      </TableBody>
    </TableView>
  );
}
