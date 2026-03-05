runner runs a shell script and has a stop method, that stops this script gracefully and then runs a cleanup script afterwards. So after calling stop, you can safely spawn a new instance of the same command

`set CMD_TEST=true` to not execute the command and instead just log the command
