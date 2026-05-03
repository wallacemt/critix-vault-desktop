; NSIS hooks for Critix Vault installer/uninstaller
; Removes persisted app data to avoid stale database/schema across reinstallations.

!macro NSIS_HOOK_PREUNINSTALL
  SetShellVarContext current
  RMDir /r "$APPDATA\\critix-vault"
  RMDir /r "$LOCALAPPDATA\\critix-vault"
!macroend
