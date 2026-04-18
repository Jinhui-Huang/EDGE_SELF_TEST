@echo off
mvn -pl apps/core-platform -am install -DskipTests
mvn -f apps/core-platform/pom.xml org.codehaus.mojo:exec-maven-plugin:3.3.0:java "-Dexec.mainClass=com.example.webtest.platform.CorePlatformApp" "-Dexec.args=dsl-smoke config/smoke/core-platform-smoke.yml"