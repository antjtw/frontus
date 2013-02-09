
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
#!/bin/sh -x
# Unset GIT_DIR or the universe will implode
unset GIT_DIR
# Change directory to the working tree; exit on failure
cd ../ || exit
#
while read oldrev newrev refname
do
    branch=$(git rev-parse --symbolic --abbrev-ref $refname)
    if [ "master" = "$branch" ]; then
        echo "checking out master"
        git checkout -f master
        git submodule update --init --recursive --force
    fi
done
```

- don't forget to `chmod a+x .git/hooks/post-receive`

On the client side:

`git remote add ec2-testing sharewave-testing:/var/repo/frontus`
'git remote set-url ec2-testing sharewave-testing:/var/repo/frontus'

`git push ec2-testing +master:refs/heads/master`


Subsequent deployments are done with: `git push ec2-testing`.


