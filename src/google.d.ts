// Google Identity Services type declarations
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string; select_by: string }) => void;
    auto_select?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      width?: string;
      text?: string;
      shape?: string;
    }
  ): void;
  prompt(): void;
}

interface Window {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}
