#/bin/bash
TAG="1.0.0"

echo "Creating tag: $TAG"
git tag -a ${TAG} -m "et-mail-app ${TAG} release"
if [ $? -eq 0 ]; then
  echo "Pushing tag: $TAG"
  git push origin ${TAG}
fi

