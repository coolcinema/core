import { Octokit } from "@octokit/rest";
import { CONFIG } from "../config";

export interface FileToUpload {
  path: string;
  content: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    if (!CONFIG.GITHUB.TOKEN)
      throw new Error("Missing COOLCINEMA_GH_PKG_TOKEN");
    this.octokit = new Octokit({ auth: CONFIG.GITHUB.TOKEN });
  }

  async getFileContent(path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: CONFIG.GITHUB.OWNER,
        repo: CONFIG.GITHUB.REPO,
        path,
        ref: CONFIG.GITHUB.BRANCH,
      });
      if (!Array.isArray(data) && "content" in data) {
        return Buffer.from(data.content, "base64").toString("utf8");
      }
    } catch (e) {
      /* ignore 404 */
    }
    return null;
  }

  async createAtomicCommit(files: FileToUpload[], message: string) {
    const { OWNER, REPO, BRANCH } = CONFIG.GITHUB;

    const { data: ref } = await this.octokit.rest.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
    });
    const latestCommitSha = ref.object.sha;

    const { data: commit } = await this.octokit.rest.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commit.tree.sha;

    const treeItems = [];
    for (const file of files) {
      const { data: blob } = await this.octokit.rest.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content: file.content,
        encoding: "utf-8",
      });
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner: OWNER,
      repo: REPO,
      base_tree: baseTreeSha,
      tree: treeItems as any,
    });

    const { data: newCommit } = await this.octokit.rest.git.createCommit({
      owner: OWNER,
      repo: REPO,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    await this.octokit.rest.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`,
      sha: newCommit.sha,
    });

    return newCommit.sha;
  }
}
