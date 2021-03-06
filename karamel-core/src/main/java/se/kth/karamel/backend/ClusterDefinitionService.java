/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package se.kth.karamel.backend;

import com.google.common.base.Charsets;
import com.google.common.io.Files;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;
import se.kth.karamel.client.model.Cookbook;
import se.kth.karamel.client.model.Ec2;
import se.kth.karamel.client.model.json.JsonCluster;
import se.kth.karamel.client.model.yaml.YamlCluster;
import se.kth.karamel.client.model.yaml.YamlGroup;
import se.kth.karamel.client.model.yaml.YamlPropertyRepresenter;
import se.kth.karamel.client.model.yaml.YamlUtil;
import se.kth.karamel.common.Settings;
import se.kth.karamel.common.exception.KaramelException;
import java.nio.file.*;
import se.kth.karamel.common.FilesystemUtil;

/**
 *
 * @author kamal
 */
public class ClusterDefinitionService {

  public static String jsonToYaml(JsonCluster jsonCluster) throws KaramelException {
    YamlCluster yamlCluster = new YamlCluster(jsonCluster);
    DumperOptions options = new DumperOptions();
    options.setIndent(2);
    options.setWidth(120);
    options.setExplicitEnd(false);
    options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
    options.setPrettyFlow(true);
    options.setDefaultScalarStyle(DumperOptions.ScalarStyle.PLAIN);
    YamlPropertyRepresenter yamlPropertyRepresenter = new YamlPropertyRepresenter();
    yamlPropertyRepresenter.addClassTag(YamlCluster.class, Tag.MAP);
    yamlPropertyRepresenter.addClassTag(Ec2.class, Tag.MAP);
    yamlPropertyRepresenter.addClassTag(Cookbook.class, Tag.MAP);
    yamlPropertyRepresenter.addClassTag(YamlGroup.class, Tag.MAP);
    yamlPropertyRepresenter.addClassTag(HashSet.class, Tag.MAP);
    Yaml yaml = new Yaml(yamlPropertyRepresenter, options);
    String content = yaml.dump(yamlCluster);
    return content;
  }

  public static void saveYaml(String yaml) throws KaramelException {
    try {
      YamlCluster cluster = YamlUtil.loadCluster(yaml);
      String name = cluster.getName().toLowerCase();
      File folder = new File(Settings.CLUSTER_ROOT_PATH(name));
      if (!folder.exists()) {
        folder.mkdirs();
      }
      File file = new File(Settings.CLUSTER_YAML_PATH(name));
      Files.write(yaml, file, Charset.forName("UTF-8"));
    } catch (IOException ex) {
      throw new KaramelException("Could not convert yaml to java ", ex);
    }
  }

  public static String loadYaml(String clusterName) throws KaramelException {
    try {
      String name = clusterName.toLowerCase();
      File folder = new File(Settings.CLUSTER_ROOT_PATH(name));
      if (!folder.exists()) {
        throw new KaramelException(String.format("cluster '%s' is not available", name));
      }
      String yamlPath = Settings.CLUSTER_YAML_PATH(name);
      File file = new File(yamlPath);
      if (!file.exists()) {
        throw new KaramelException(String.format("yaml '%s' is not available", yamlPath));
      }
      String yaml = Files.toString(file, Charsets.UTF_8);
      return yaml;
    } catch (IOException ex) {
      throw new KaramelException("Could not save the yaml ", ex);
    }
  }

  public static void removeDefinition(String clusterName) throws KaramelException {
    String name = clusterName.toLowerCase();
    try {
      FilesystemUtil.deleteRecursive(Settings.CLUSTER_ROOT_PATH(name));
    } catch (FileNotFoundException ex) {
      throw new KaramelException(ex);
    }
  }

  public static List<String> listClusters() throws KaramelException {
    List<String> clusters = new ArrayList();
    File folder = new File(Settings.KARAMEL_ROOT_PATH);
    if (folder.exists()) {
      File[] files = folder.listFiles();
      for (File file : files) {
        if (file.isDirectory()) {
          File[] files2 = file.listFiles();
          for (File file2 : files2) {
            if (file2.isFile() && file2.getName().equals(Settings.YAML_FILE_NAME)) {
              clusters.add(file.getName());
            }
          }
        }
      }
    }
    return clusters;
  }

  public static String jsonToYaml(String json) throws KaramelException {
    Gson gson = new Gson();
    JsonCluster jsonCluster = gson.fromJson(json, JsonCluster.class);
    return jsonToYaml(jsonCluster);
  }

  public static JsonCluster yamlToJsonObject(String yaml) throws KaramelException {
    YamlCluster cluster = YamlUtil.loadCluster(yaml);
    return new JsonCluster(cluster);
  }

  public static String yamlToJson(String yaml) throws KaramelException {
    JsonCluster jsonObj = yamlToJsonObject(yaml);
    return serializeJson(jsonObj);
  }

  public static String serializeJson(JsonCluster jsonCluster) throws KaramelException {
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    String json = gson.toJson(jsonCluster);
    return json;
  }
}
