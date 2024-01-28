import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useReducer, useState } from "react";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";
import "./App.css";
import { Button, Stack, SwipeableDrawer } from "@mui/material";
import { fetchOne } from "./api";
import React from "react";
import Snackbar from "@mui/material/Snackbar";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Cell,
  Position,
  Action,
  GameState,
  StateReducer,
  emptyStatistics,
  emptyBoard,
  History,
  ActionType,
} from "./types";
import Draggable from "react-draggable";
import GameDialog from "./dialog";
import DifficultyChooser from "./difficulty-chooser";

library.add(fas);

export default function App() {
  return <BoardGame />;
}

interface CellProps {
  row: number;
  col: number;
  cell: Cell;
  currentNumber: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}

const SudokuCell: React.FC<CellProps> = ({
  row,
  col,
  cell,
  currentNumber,
  isSelected,
  isHighlighted,
  onClick,
}) => {
  const isSameNumber = (value: number) => {
    return currentNumber !== 0 && value === currentNumber;
  };
  const bgColor = () => {
    if (isSameNumber(cell.value)) {
      return "bg-blue-300";
    } else if (isHighlighted) {
      return "bg-blue-100";
    } else {
      return "bg-white";
    }
  };
  const borderColor = () => {
    if (isSelected) {
      return "z-10 border-red-500 border-4";
    } else {
      return "border-r-black";
    }
  };
  const textColor = () => {
    if (cell.preset) {
      return "text-black";
    } else {
      return "text-gray-400";
    }
  };
  return (
    <div
      className={`w-20 h-20 flex justify-center items-center border border-gray-400 ${
        isBoldTopBorder(row) ? "border-t-4 border-t-black" : ""
      } ${isBoldBottomBorder(row) ? "border-b-4 border-b-black" : ""} ${
        isBoldLeftBorder(col) ? "border-l-4 border-l-black" : ""
      } ${isBoldRightBorder(col) ? "border-r-4 border-r-black" : ""}
      hover:shadow-outline 
      ${bgColor()} ${borderColor()} ${textColor()}`}
      onClick={onClick}
    >
      {cell.value !== 0 ? (
        <p className="text-5xl text-center">{cell.value}</p>
      ) : (
        <div className="grid grid-cols-3 gap-1 text-1xl">
          {" "}
          {/* Adjust grid and text size as needed */}
          {Array.from(cell.notes)
            .sort((a, b) => a - b)
            .map((note) => (
              <span
                key={note}
                className={`flex items-center justify-center ${
                  isSameNumber(note)
                    ? "text-red-600 bg-yellow-400 rounded-full"
                    : ""
                }`}
              >
                {note}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

const isInSameRow = (selectedCell: Position | null, cellRow: number) =>
  selectedCell && selectedCell.row === cellRow;
const isInSameColumn = (selectedCell: Position | null, cellCol: number) =>
  selectedCell && selectedCell.col === cellCol;

const isInSameBox = (
  selectedCell: Position | null,
  cellRow: number,
  cellCol: number
) => {
  if (!selectedCell) return false;

  const startRow = Math.floor(selectedCell.row / 3) * 3;
  const startCol = Math.floor(selectedCell.col / 3) * 3;

  return (
    cellRow >= startRow &&
    cellRow < startRow + 3 &&
    cellCol >= startCol &&
    cellCol < startCol + 3
  );
};

interface ToolBarProps {
  isNoteTaking: boolean;
  undo: () => void;
  redo: () => void;
  fillNotes: () => void;
  toggleNoteTaking: () => void;
}

const ToolKits: React.FC<ToolBarProps> = ({
  isNoteTaking,
  undo,
  redo,
  fillNotes,
  toggleNoteTaking,
}) => {
  return (
    <Draggable defaultClassName="absolute flex flex-col items-center justify-center w-10 gap-4 top-[350px] right-10">
      <Stack className="">
        <Button onClick={undo}>
          <div className="items-center justify-center h-10">
            <FontAwesomeIcon onClick={undo} icon="rotate-left" size="2x" />
          </div>
        </Button>

        <Button onClick={redo}>
          <div className="items-center justify-center h-10">
            <FontAwesomeIcon onClick={redo} icon="rotate-right" size="2x" />
          </div>
        </Button>

        <div className="items-center justify-center h-10">
          <Button onClick={toggleNoteTaking}>
            <div className="flex items-center justify-center w-10 h-10">
              <FontAwesomeIcon
                icon="pencil"
                size="2x"
                color={isNoteTaking ? "blue" : "black"}
              />
              <p className={`ml-2 ${isNoteTaking ? "bg-red" : "bg-white"}`}>
                {isNoteTaking ? "On" : "Off"}
              </p>
            </div>
          </Button>
        </div>
        <Button onClick={redo}>
          <div className="items-center justify-center h-10">
            <FontAwesomeIcon onClick={fillNotes} icon="coffee" size="2x" />
          </div>
        </Button>
      </Stack>
    </Draggable>
  );
};

function isBoldTopBorder(row: number) {
  return row % 3 === 0;
}

function isBoldBottomBorder(row: number) {
  return (row + 1) % 3 === 0;
}

function isBoldLeftBorder(col: number) {
  return col % 3 === 0;
}
function isBoldRightBorder(col: number) {
  return (col + 1) % 3 === 0;
}

const BoardGame = () => {
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  // to be used in eventListener, where the useState might not be updated
  const selectedCellRef = React.useRef(selectedCell);
  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  const [state, dispatch] = useReducer(
    StateReducer,
    new GameState(emptyBoard(), new History(), emptyStatistics())
  );

  const stateRef = React.useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [success, setSuccess] = useState(false);
  const [restartDialog, setRestartDialog] = useState(false);
  const [difficultyDialog, setDifficultyDialog] = useState(false);
  const [difficulty, setDifficulty] = useState("Easy" as string);
  const closeDialog = () => {
    setRestartDialog(false);
  };
  const restart = () => {
    setRestartDialog(false);
    setDifficultyDialog(true);
  };

  useEffect(() => {
    if (state.stat.preset + state.stat.filled === 81) {
      setSuccess(true);
      setRestartDialog(true);
    } else {
      setSuccess(false);
      setRestartDialog(false);
    }
  }, [state]);

  const fetchData = () => {
    fetchOne("sudokuApi")?.then((puzzle) => {
      if (puzzle !== null) {
        // initialize the new board && solution && stat
        let act = new Action(ActionType.RELOAD, {
          pos: { row: 0, col: 0 },
          value: 0,
          puzzle: puzzle,
        });
        dispatch(act);
      }
    });
  };

  useEffect(() => {
    // fetchData();
  });

  const handleCellPress = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const handleNumberPress = (number: number) => {
    if (selectedCellRef.current !== null) {
      handleCellUpdate(selectedCellRef.current, number);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key >= "1" && event.key <= "9") {
      event.preventDefault();
      handleNumberPress(parseInt(event.key));
    }
  };
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const boardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        boardRef.current &&
        !boardRef.current.contains(event.target as Node)
      ) {
        if (!(event.target as HTMLElement).closest("button")) {
          setSelectedCell(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [boardRef]);

  const handleCellUpdate = (pos: Position, value: number) => {
    const row = pos.row;
    const col = pos.col;
    let action: Action;

    if (!stateRef.current || !stateRef.current.puzzle) {
      return;
    }
    let state = stateRef.current;
    let solution = state.puzzle!.solution;

    if (!state.board[row][col].preset) {
      if (isNoteTaking) {
        if (state.board[row][col].notes.has(value)) {
          action = new Action(ActionType.REMOVE_NOTE, { pos, value });
        } else {
          action = new Action(ActionType.ADD_NOTE, { pos, value });
        }
      } else {
        if (state.board[row][col].value === value) {
          action = new Action(ActionType.UNSET, { pos, value });
        } else if (solution[row][col] === value) {
          action = new Action(ActionType.SET, { pos, value });
        } else {
          action = new Action(ActionType.NOP, { pos, value });
        }
      }
      dispatch(action);
    }
  };

  const closeNotification = () => {
    dispatch(
      new Action(ActionType.CLOSE_NOTIFICATION, {
        pos: { row: 0, col: 0 },
        value: 0,
      })
    );
  };

  const [isNoteTaking, setIsNoteTaking] = useState(false);
  const toggleNoteTaking = () => {
    setIsNoteTaking((prev) => !prev);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setDrawerOpen(open);
    };

  return (
    <div className="app">
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar className="bg-zinc-100 text-zinc-950" variant="dense">
            <div className="flex items-center w-6/12">
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" color="inherit" component="div">
                Sudoku Master
              </Typography>
            </div>
            <div className="flex flex-row-reverse items-center w-6/12 gap-5">
              <Typography variant="subtitle1" color="inherit" component="div">
                {state.puzzle === undefined ? "" : "difficulty: "}
                {state.puzzle?.difficulty}
              </Typography>
              <Typography variant="subtitle1" color="inherit" component="div">
                {state.puzzle === undefined ? "" : `wrong: ${state.stat.wrong}`}
              </Typography>
            </div>
          </Toolbar>
        </AppBar>
        <SwipeableDrawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
          onOpen={toggleDrawer(true)}
        >
          <div>
            <Button title="Reload Board" onClick={fetchData}>
              reload board
            </Button>
          </div>
          <div>
            <Button
              title="open dialog"
              onClick={() => {
                setSuccess(true);
                setRestartDialog(true);
              }}
            >
              open dialog
            </Button>
          </div>
        </SwipeableDrawer>
      </Box>
      <Stack spacing={2}>
        <div className="flex items-center justify-center cursor-pointer">
          <div className="grid grid-cols-9 gap-0" ref={boardRef}>
            {state.board.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <SudokuCell
                    row={rowIndex}
                    col={colIndex}
                    isSelected={
                      selectedCell?.row === rowIndex &&
                      selectedCell?.col === colIndex
                    }
                    currentNumber={
                      selectedCell === null
                        ? 0
                        : state.board[selectedCell.row][selectedCell.col].value
                    }
                    isHighlighted={
                      isInSameRow(selectedCell, rowIndex) ||
                      isInSameColumn(selectedCell, colIndex) ||
                      isInSameBox(selectedCell, rowIndex, colIndex)
                    }
                    key={9 * rowIndex + colIndex}
                    cell={cell}
                    onClick={() => handleCellPress(rowIndex, colIndex)}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          {state.stat.numberLeft.map((value, index) => (
            <Button
              color="secondary"
              variant="contained"
              key={index}
              disabled={value === 0}
              onClick={() => handleNumberPress(index + 1)}
            >
              <p className="text-6xl">{index + 1}</p>
              <div className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xl rounded-xl">
                {value}
              </div>
            </Button>
          ))}
        </div>
      </Stack>

      <ToolKits
        isNoteTaking={isNoteTaking}
        toggleNoteTaking={toggleNoteTaking}
        undo={() => {
          dispatch(new Action(ActionType.UNDO));
        }}
        redo={() => {
          dispatch(new Action(ActionType.REDO));
        }}
        fillNotes={() => {
          dispatch(new Action(ActionType.FILL_NOTES));
        }}
      />
      <div>
        {success && (
          <GameDialog
            open={restartDialog}
            onClose={closeDialog}
            onRestart={restart}
          />
        )}
      </div>
      <div>
        <DifficultyChooser
          open={difficultyDialog}
          onClose={() => {
            setDifficultyDialog(false);
          }}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
        />
      </div>
      <div>
        <Snackbar
          open={state.notifier?.on}
          autoHideDuration={6000}
          onClose={closeNotification}
          message={state.notifier?.msg}
          action={
            <Button color="secondary" size="small" onClick={closeNotification}>
              close
            </Button>
          }
        />
      </div>
    </div>
  );
};
