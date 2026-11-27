Unicode True
!include "FileFunc.nsh"
Name "Cellar SpaceFix"
OutFile "installer\SpaceFix.exe"
RequestExecutionLevel user
SilentInstall normal
AutoCloseWindow true
Page instfiles
SetCompressor /SOLID lzma
Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\SpaceFix"
  File /r "images\SpaceFix\*"
  HideWindow
  ${GetParameters} $0
  StrCmp $0 "--smoke-test" test normal
  test:
    ExecWait '"$OUTDIR\SpaceFix.exe" --smoke-test' $1
    Goto finished
  normal:
    ExecWait '"$OUTDIR\SpaceFix.exe"' $1
  finished:
    IfErrors failed
    SetErrorLevel $1
    Goto done
  failed:
    MessageBox MB_ICONSTOP "Windows could not start SpaceFix. Check that your temporary folder has free space and allows applications to run."
    SetErrorLevel 1
  done:
SectionEnd
