import React, { useMemo, useState } from "react";
import {
  Cell,
  Column,
  Flex,
  ProgressCircle,
  TableBody,
  TableHeader,
  TableView,
  Row,
  Text,
  View
} from "@adobe/react-spectrum";

const STEP_STATE = {
  NOT_STARTED: "Not started",
  RUNNING: "Running",
  FINISHED: "Finished"
};

export default function WorkflowRunner({
  steps,
  context,
  runSignal
}) {
  const initial = useMemo(() => {
    return steps.map((s, idx) => ({
      id: s.id || String(idx + 1),
      number: idx + 1,
      description: s.description || "",
      state: STEP_STATE.NOT_STARTED,
      success: null,
      detail: ""
    }));
  }, [steps]);

  const [rows, setRows] = useState(initial);

  // Reset rows if steps change
  React.useEffect(() => {
    setRows(initial);
  }, [initial]);

  React.useEffect(() => {
    if (!runSignal) return;

    let cancelled = false;

    const run = async () => {
      // reset
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          state: STEP_STATE.NOT_STARTED,
          success: null,
          detail: ""
        }))
      );

      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;

        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, state: STEP_STATE.RUNNING } : r
          )
        );

        try {
          const result = await steps[i].run(context);

          if (cancelled) return;

          const ok = result && result.ok === true;
          const detail = result && typeof result.detail === "string" ? result.detail : "";

          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    state: STEP_STATE.FINISHED,
                    success: ok,
                    detail
                  }
                : r
            )
          );

          // Stop the workflow on first failure
          if (!ok) return;

        } catch (err) {
          if (cancelled) return;

          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    state: STEP_STATE.FINISHED,
                    success: false,
                    detail: err && err.message ? err.message : "Step failed"
                  }
                : r
            )
          );
          return;
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [runSignal, steps, context]);

  const renderState = (row) => {
    if (row.state === STEP_STATE.RUNNING) {
      return (
        <Flex direction="row" alignItems="center" gap="size-100">
          <ProgressCircle size="S" aria-label="Running" isIndeterminate />
          <Text>{row.state}</Text>
        </Flex>
      );
    }
    return <Text>{row.state}</Text>;
  };

  const renderSuccess = (row) => {
    if (row.success === null) return <Text></Text>;
    return <Text>{row.success ? "Yes" : "No"}</Text>;
  };

  return (
    <View>
      <TableView
        aria-label="Workflow steps"
        selectionMode="none"
        isQuiet
        width="100%"
      >
        <TableHeader>
          <Column key="step" width={80}>Step</Column>
          <Column key="desc">Description</Column>
          <Column key="state" width={160}>State</Column>
          <Column key="ok" width={100}>Success</Column>
        </TableHeader>

        <TableBody items={rows}>
          {(item) => (
            <Row key={item.id}>
              <Cell>{item.number}</Cell>
              <Cell>
                <Text>{item.description}</Text>
                {item.detail ? (
                  <Text>{item.detail}</Text>
                ) : null}
              </Cell>
              <Cell>{renderState(item)}</Cell>
              <Cell>{renderSuccess(item)}</Cell>
            </Row>
          )}
        </TableBody>
      </TableView>
    </View>
  );
}
