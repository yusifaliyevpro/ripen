import { SiNpm } from "react-icons/si";
import { VscGithubInverted } from "react-icons/vsc";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-text-dim">
          Built by{" "}
          <a
            href="https://yusifaliyevpro.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted transition-colors hover:text-orange"
          >
            Yusif Aliyev
          </a>
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-dim transition-colors hover:text-orange"
          >
            <VscGithubInverted className="h-5 w-5" />
          </a>
          <a
            href="https://www.npmjs.com/package/ripencli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-dim transition-colors hover:text-orange"
          >
            <SiNpm className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
