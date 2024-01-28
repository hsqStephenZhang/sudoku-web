import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

interface GameDialogProps {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

const GameDialog: React.FC<GameDialogProps> = ({
  open,
  onClose,
  onRestart,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>游戏成功</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Congratulations! You have completed the game! Do you want to restart?
        </DialogContentText>
        {/* 这里可以添加难度选择的组件 */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={onRestart} color="primary">
          restart
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameDialog;
