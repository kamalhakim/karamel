#!/bin/bash

set -e

# This reads the pom.xml file in the current directory, and extracts the first version element in the xml version element.
version=`grep -o -a -m 1 -h -r "version>.*</version" pom.xml | head -1 | sed "s/version//g" | sed "s/>//" | sed "s/<\///g"`

echo "version is: $version"

dist=karamel-$version

mvn clean package
cd target

#create linux archive
cp -r appassembler/* $dist/
cp ../README.linux $dist/README.txt
tar zcf ${dist}.tgz $dist
mv $dist ${dist}-linux


#create jar archive
mkdir ${dist}-jar
cp karamel-ui-${version}-shaded.jar ${dist}-jar/karamel-ui-${version}.jar
cp -r appassembler/examples ${dist}-jar/
cp -r appassembler/conf/* ${dist}-jar/ 
cp ../README.jar ${dist}-jar/README.txt 
zip -r ${dist}-jar.zip $dist-jar

scp ${dist}.tgz glassfish@snurran.sics.se:/var/www/karamel.io/sites/default/files/downloads/
scp ${dist}-jar.zip glassfish@snurran.sics.se:/var/www/karamel.io/sites/default/files/downloads/

echo "Now building windows distribution"
cd ..
mvn -Dwin clean package
cd target
mv karamel.exe $dist
#create windows archive
cp ../README.windows $dist/README.txt
zip -r ${dist}.zip $dist

mv ${dist} ${dist}-windows

scp ${dist}.zip glassfish@snurran.sics.se:/var/www/karamel.io/sites/default/files/downloads/
cd ..

echo "finished releasing karamel"
