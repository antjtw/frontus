
This repository contains the DocumentRoot for the apache server.

To set up a new instance:

- Create a directory which is configured to be the DocumentRoot for apache (or create a symlink which points to it).

- cd into that directory

- `git init`

- `git config --bool receive.denyCurrentBranch false`

- `git config --path core.worktree ../`

- Then:
```shell
cat >.git/hooks/post-receive <<EOF
#!/bin/bash

 while read oldrev newrev refname
 do
# Unset GIT_DIR or the universe will implode                                                       
    unset GIT_DIR
    cd ../ || exit
    git checkout --force
    git submodule update --init --recursive --force
    ./post-receive $oldrev $newrev $refname
 done

echo Done
```

- don't forget to `chmod a+x .git/hooks/post-receive`

On the client side:

`git remote add name-for-remote remote-ssh-hostname:/remote-directory`
`git push name-for-remote +master:refs/heads/master`

Subsequent deployments are done with: `git push name-for-remote`.


