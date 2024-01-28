import assert from "assert";

export interface Position {
    row: number;
    col: number;
}

export interface Cell {
    value: number; // The value of the cell (0 if empty)
    preset: boolean; // True if the value is pre-set and should not be changed
    notes: Set<number>; // A set of possible values (notes) for the cell
}

export type Board = Cell[][]; // The inner 9x9 board

export const emptyBoard = () => {
    return Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => ({
            value: 0,
            preset: false,
            notes: new Set<number>(),
        }))
    );
};

export interface Puzzle {
    value: Array<Array<number>>,
    solution: Array<Array<number>>,
    difficulty: "Easy" | "Medium" | "Hard" | "Very-hard" | "Insane"
}

export enum Difficulty {
    Easy = 0,
    Medium = 1,
    Hard = 2,
    VeryHard = 3,
    Insane = 4,
}

export enum ActionType {
    // should be stored in history
    SET,
    UNSET,
    ADD_NOTE,
    REMOVE_NOTE,

    // undo/redo
    UNDO,
    REDO,
    FILL_NOTES,

    // other 
    RELOAD,
    NOP,
    CLOSE_NOTIFICATION,
}

interface Payload {
    pos: Position;
    value: number;
    puzzle?: Puzzle;
}

export class Action {
    t: ActionType;
    payload?: Payload;

    constructor(t: ActionType, payload?: Payload) {
        this.t = t;
        this.payload = payload;
    }
}

// reverse an action
const reverse: (action: Action) => Action = (action) => {
    if (action.payload) {
        switch (action.t) {
            case ActionType.SET: return { ...action, t: ActionType.UNSET };
            case ActionType.UNSET: return { ...action, t: ActionType.SET };
            case ActionType.ADD_NOTE: return { ...action, t: ActionType.REMOVE_NOTE };
            case ActionType.REMOVE_NOTE: return { ...action, t: ActionType.ADD_NOTE };
        }
    }
    return action;
}

export type ActionGroup = Action[];

export class History {
    actionGroups: ActionGroup[] = [];
    undoActionGroups: ActionGroup[] = [];

    constructor(actionGroups?: ActionGroup[], undoActionGroups?: ActionGroup[]) {
        if (actionGroups) {
            this.actionGroups = actionGroups;
        }
        if (undoActionGroups) {
            this.undoActionGroups = undoActionGroups;
        }
    }

    undo(actionGroup: ActionGroup): History {
        const newActionGroups = this.actionGroups.slice(0, this.actionGroups.length - 1);
        const newUndoActionGroups = this.undoActionGroups.slice();
        newUndoActionGroups.push(actionGroup);
        return new History(newActionGroups, newUndoActionGroups);
    }

    redo(actionGroup: ActionGroup): History {
        const newActionGroups = this.actionGroups.slice();
        newActionGroups.push(actionGroup);
        const newUndoActionGroups = this.undoActionGroups.slice(0, this.undoActionGroups.length - 1);
        return new History(newActionGroups, newUndoActionGroups);
    }

    add(action: Action): History {
        const group = [action];
        return this.addGroup(group);
    }

    addGroup(actionGroup: ActionGroup): History {
        console.log("add actions", actionGroup);
        const newActionGroups = this.actionGroups.slice();
        newActionGroups.push(actionGroup);
        return new History(newActionGroups, []);
    }
}

export interface Statistics {
    preset: number;
    filled: number;
    wrong: number;
    numberLeft: number[],
}

export const emptyStatistics = () => {
    return {
        preset: 0,
        filled: 0,
        wrong: 0,
        numberLeft: Array.from({ length: 9 }, () => 9),
    }
}

export interface Notifier {
    msg: string;
    on: boolean;
}

export const emptyNotifier = () => {
    return {
        msg: "",
        on: false,
    }
}


const sendNotification = (notifier: Notifier, msg: string) => {
    notifier.on = true;
    notifier.msg = msg;
}

const clearNotification = (notifier: Notifier) => {
    notifier.on = false;
    notifier.msg = "";
}

export class GameState {
    board: Board;
    history: History;
    stat: Statistics;
    notifier: Notifier = emptyNotifier();
    // the original puzzle
    puzzle: Puzzle | undefined = undefined;

    constructor(board: Board, history: History, stat: Statistics, notifier?: Notifier, puzzle?: Puzzle) {
        this.board = board;
        this.history = history;
        this.stat = stat;
        if (notifier) {
            this.notifier = notifier;
        }
        this.puzzle = puzzle;
    }

    // apply an action to the board, return a new state
    apply(action: Action): GameState {
        let newState = this.applyOneAction(action, true);
        return newState;
    }

    // undo the last action
    undo(): GameState {
        console.log("undo", this.history.actionGroups.length, this.history.undoActionGroups.length);
        if (this.history.actionGroups.length === 0) {
            return this;
        }
        const actionGroup = this.history.actionGroups[this.history.actionGroups.length - 1];
        let newState = this.applyActionGroup(actionGroup, reverse);
        newState.history = newState.history.undo(actionGroup);
        return newState;
    }

    redo(): GameState {
        console.log("redo", this.history.actionGroups.length, this.history.undoActionGroups.length);
        if (this.history.undoActionGroups.length === 0) {
            return this;
        }
        const actionGroup = this.history.undoActionGroups[this.history.undoActionGroups.length - 1];
        let newState = this.applyActionGroup(actionGroup);
        newState.history = newState.history.redo(actionGroup);
        return newState;
    }

    fillNotes(): GameState {
        let { board, stat, history, notifier, puzzle } = { ...this };
        let newState = new GameState(board, history, stat, notifier, puzzle);
        let actionGroup = [];
        let rowAlreadyNumbers = Array.from({ length: 9 }, () => new Set<number>());
        let colAlreadyNumbers = Array.from({ length: 9 }, () => new Set<number>());
        let blockAlreadyNumbers = Array.from({ length: 9 }, () => new Set<number>());
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                rowAlreadyNumbers[row].add(board[row][col].value);
            }
        }
        for (let col = 0; col < 9; col++) {
            for (let row = 0; row < 9; row++) {
                colAlreadyNumbers[col].add(board[row][col].value);
            }
        }
        for (let block = 0; block < 9; block++) {
            for (let row = Math.floor(block / 3) * 3; row < Math.floor(block / 3) * 3 + 3; row++) {
                for (let col = Math.floor(block % 3) * 3; col < Math.floor(block % 3) * 3 + 3; col++) {
                    blockAlreadyNumbers[block].add(board[row][col].value);
                }
            }
        }
        for (let col = 0; col < 9; col++) {
            for (let row = 0; row < 9; row++) {
                if (board[row][col].value === 0) {
                    for (let value = 1; value <= 9; value++) {
                        if (!rowAlreadyNumbers[row].has(value) && !colAlreadyNumbers[col].has(value) && !blockAlreadyNumbers[Math.floor(row / 3) * 3 + Math.floor(col / 3)].has(value)) {
                            board[row][col].notes.add(value);
                            actionGroup.push(new Action(ActionType.ADD_NOTE, { pos: { row: row, col: col }, value: value }));
                        }
                    }
                }
            }
        }

        newState = newState.applyActionGroup(actionGroup,);
        newState.history = newState.history.addGroup(actionGroup);
        return newState;
    }

    // will not update the history, should update the history outside
    applyActionGroup(actionGroup: ActionGroup, mapper?: (action: Action) => Action): GameState {
        let { board, stat, history, notifier, puzzle } = { ...this };
        let newState = new GameState(board, history, stat, notifier, puzzle);
        for (let action of actionGroup) {
            if (mapper) {
                action = mapper(action);
            }
            newState = newState.applyOneAction(action, false);
        }
        return newState;
    }

    applyOneAction(action: Action, remember: boolean): GameState {
        if (action.payload === undefined) {
            return this;
        }
        let { board, stat, history, notifier, puzzle } = { ...this };

        const rowIdx = action.payload.pos.row;
        const colIdx = action.payload.pos.col;
        assert(rowIdx >= 0 && rowIdx < 9);
        assert(colIdx >= 0 && colIdx < 9);
        assert(board.length === 9);
        assert(board[0].length === 9);

        let newBoard = board.map((row, rowIndex) => row.map((cell, colIndex) => {
            if (rowIdx === rowIndex && colIdx === colIndex) {
                return { ...cell };
            } else {
                return cell;
            }
        }));

        switch (action.t) {
            case ActionType.SET:
                if (newBoard[rowIdx][colIdx].value === action.payload.value) {
                    break;
                }
                newBoard[rowIdx][colIdx].value = action.payload.value;
                let numberLeft1 = [...stat.numberLeft];
                numberLeft1[action.payload.value - 1] -= 1;
                stat.numberLeft = numberLeft1;
                stat.filled += 1;
                if (remember) {
                    // root action && update notes actions
                    let actionGroup = [];
                    actionGroup.push(action);
                    for (let row = 0; row < 9; row++) {
                        if (newBoard[row][colIdx].notes.has(action.payload.value)) {
                            newBoard[row][colIdx].notes.delete(action.payload.value);
                            actionGroup.push(new Action(ActionType.REMOVE_NOTE, { pos: { row: row, col: colIdx }, value: action.payload.value }));
                        }
                    }
                    for (let col = 0; col < 9; col++) {
                        if (newBoard[rowIdx][col].notes.has(action.payload.value)) {
                            newBoard[rowIdx][col].notes.delete(action.payload.value);
                            actionGroup.push(new Action(ActionType.REMOVE_NOTE, { pos: { row: rowIdx, col: col }, value: action.payload.value }));
                        }
                    }
                    for (let row = Math.floor(rowIdx / 3) * 3; row < Math.floor(rowIdx / 3) * 3 + 3; row++) {
                        for (let col = Math.floor(colIdx / 3) * 3; col < Math.floor(colIdx / 3) * 3 + 3; col++) {
                            if (newBoard[row][col].notes.has(action.payload.value)) {
                                newBoard[row][col].notes.delete(action.payload.value);
                                actionGroup.push(new Action(ActionType.REMOVE_NOTE, { pos: { row: row, col: col }, value: action.payload.value }));
                            }
                        }
                    }
                    history = history.addGroup(actionGroup);
                }
                break;
            case ActionType.UNSET:
                newBoard[rowIdx][colIdx].value = 0;
                let numberLeft2 = [...stat.numberLeft];
                numberLeft2[action.payload.value - 1] += 1;
                stat.numberLeft = numberLeft2;
                stat.filled -= 1;
                if (remember) {
                    history = history.add(action);
                }
                break;
            case ActionType.ADD_NOTE:
                // check if the note is valid
                if (stat.numberLeft[action.payload.value - 1] === 0) {
                    sendNotification(notifier, "Note is used up");
                    return new GameState(newBoard, history, stat, notifier);
                }
                for (let row = 0; row < 9; row++) {
                    if (newBoard[row][colIdx].value === action.payload.value) {
                        sendNotification(notifier, "Note is invalid");
                        return new GameState(newBoard, history, stat, notifier);
                    }
                }
                for (let col = 0; col < 9; col++) {
                    if (newBoard[rowIdx][col].value === action.payload.value) {
                        sendNotification(notifier, "Note is invalid");
                        return new GameState(newBoard, history, stat, notifier);
                    }
                }
                for (let row = Math.floor(rowIdx / 3) * 3; row < Math.floor(rowIdx / 3) * 3 + 3; row++) {
                    for (let col = Math.floor(colIdx / 3) * 3; col < Math.floor(colIdx / 3) * 3 + 3; col++) {
                        if (newBoard[row][col].value === action.payload.value) {
                            sendNotification(notifier, "Note is invalid");
                            return new GameState(newBoard, history, stat, notifier);
                        }
                    }
                }

                newBoard[rowIdx][colIdx].notes.add(action.payload.value);
                if (remember) {
                    history = history.add(action);
                }
                break;
            case ActionType.REMOVE_NOTE:
                newBoard[rowIdx][colIdx].notes.delete(action.payload.value);
                if (remember) {
                    history = history.add(action);
                }
                break;
            case ActionType.RELOAD:
                puzzle = action.payload.puzzle!;
                stat.filled = 0;
                stat.preset = 0;
                stat.wrong = 0;

                newBoard = emptyBoard();
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        newBoard[row][col].value = puzzle.value[row][col];
                        newBoard[row][col].preset = puzzle?.value[row][col] !== 0;
                        if (puzzle.value[row][col] !== 0) {
                            stat.preset += 1;
                            stat.numberLeft[puzzle.value[row][col] - 1] -= 1;
                        }
                    }
                }
                break;
            case ActionType.CLOSE_NOTIFICATION:
                clearNotification(notifier);
                break;
            case ActionType.NOP:
                stat.wrong += 1;
                sendNotification(notifier, "Wrong value");
                break;
        }
        return new GameState(newBoard, history, stat, notifier, puzzle);
    }
}

export const StateReducer: (state: GameState, action: Action) => GameState = (state: GameState, action: Action) => {
    switch (action.t) {
        case ActionType.UNDO:
            return state.undo();
        case ActionType.REDO:
            return state.redo();
        case ActionType.FILL_NOTES:
            return state.fillNotes();
    }
    return state.apply(action);
}

// apply one action to a board
