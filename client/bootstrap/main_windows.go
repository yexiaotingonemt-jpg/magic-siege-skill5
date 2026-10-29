// Repository launcher: reuse a local Electron runtime and run the pulled snapshot.
package main

import (
 "archive/zip"
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "errors"
 "flag"
 "fmt"
 "io"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "strings"
 "syscall"
 "unsafe"
)

type Part struct { File string `json:"file"`; SHA256 string `json:"sha256"` }
type Runtime struct { Version string `json:"version"`; SHA256 string `json:"sha256"`; Parts []Part `json:"parts"` }
type Manifest struct {
 Version string `json:"version"`; ServerVersion string `json:"serverVersion"`; GameVersion string `json:"gameVersion"`
 ProtocolVersion int `json:"protocolVersion"`; Files map[string]string `json:"files"`; Runtime Runtime `json:"runtime"`
}
var user32=syscall.NewLazyDLL("user32.dll")
var kernel32=syscall.NewLazyDLL("kernel32.dll")
func wide(s string)*uint16 { p,_:=syscall.UTF16PtrFromString(s);return p }
func digest(file string)(string,error){ f,e:=os.Open(file);if e!=nil{return "",e};defer f.Close();h:=sha256.New();_,e=io.Copy(h,f);return hex.EncodeToString(h.Sum(nil)),e }
func inside(root,name string)(string,error){
 if filepath.IsAbs(name)||filepath.VolumeName(name)!="" {return "",errors.New("发布文件路径无效")}
 p:=filepath.Join(root,filepath.FromSlash(name));r,e:=filepath.Rel(root,p)
 if e!=nil||r==".."||strings.HasPrefix(r,".."+string(os.PathSeparator)){return "",errors.New("发布文件越出安装目录")};return p,nil
}
func check(root,name,expected string)error{p,e:=inside(root,name);if e!=nil{return e};hash,e:=digest(p);if e!=nil{return fmt.Errorf("缺少发布文件 %s；请完整拉取仓库：%w",name,e)};if hash!=expected{return fmt.Errorf("发布文件校验失败：%s；请重新拉取完整版本",name)};return nil}
func save(file string,value any)error{b,e:=json.MarshalIndent(value,"","  ");if e!=nil{return e};if e=os.MkdirAll(filepath.Dir(file),0700);e!=nil{return e};tmp:=file+".tmp";if e=os.WriteFile(tmp,b,0600);e!=nil{return e};return os.Rename(tmp,file)}
func unzip(file,dest string)error{
 z,e:=zip.OpenReader(file);if e!=nil{return e};defer z.Close();var total uint64
 for _,f:=range z.File{
  total+=f.UncompressedSize64;if total>1500*1024*1024||f.Mode()&os.ModeSymlink!=0{return errors.New("运行环境包格式无效")}
  target,e:=inside(dest,f.Name);if e!=nil{return e};if f.FileInfo().IsDir(){if e=os.MkdirAll(target,0700);e!=nil{return e};continue}
  if e=os.MkdirAll(filepath.Dir(target),0700);e!=nil{return e};src,e:=f.Open();if e!=nil{return e};dst,e:=os.OpenFile(target,os.O_CREATE|os.O_EXCL|os.O_WRONLY,0600);if e!=nil{src.Close();return e};_,err:=io.Copy(dst,src);src.Close();closeErr:=dst.Close();if err!=nil{return err};if closeErr!=nil{return closeErr}
 };return nil
}
func waitForPID(pid uintptr)error{
 handle,_,_:=kernel32.NewProc("OpenProcess").Call(0x100000,0,pid);if handle==0{return nil}
 result,_,_:=kernel32.NewProc("WaitForSingleObject").Call(handle,60000);kernel32.NewProc("CloseHandle").Call(handle)
 if result!=0{return errors.New("请先退出旧版游戏，再启动最新版")};return nil
}
func closeOlderWindow(version string)error{
 var oldPID uintptr
 callback:=syscall.NewCallback(func(hwnd,unused uintptr)uintptr{
  visible,_,_:=user32.NewProc("IsWindowVisible").Call(hwnd);if visible==0{return 1}
  text:=make([]uint16,256);user32.NewProc("GetWindowTextW").Call(hwnd,uintptr(unsafe.Pointer(&text[0])),256)
  title:=syscall.UTF16ToString(text)
  if strings.HasPrefix(title,"魔法王座 v")&&title!="魔法王座 v"+version{
   var pid uint32;user32.NewProc("GetWindowThreadProcessId").Call(hwnd,uintptr(unsafe.Pointer(&pid)))
   oldPID=uintptr(pid);user32.NewProc("PostMessageW").Call(hwnd,0x10,0,0);return 0
  };return 1
 })
 user32.NewProc("EnumWindows").Call(callback,0);if oldPID!=0{return waitForPID(oldPID)};return nil
}
func launchEnvironment(root,profile string)[]string{
 env:=[]string{};for _,item:=range os.Environ(){key,_,_:=strings.Cut(item,"=");if !strings.EqualFold(key,"MAGIC_REPOSITORY_ROOT")&&!strings.EqualFold(key,"MAGIC_DESKTOP_USER_DATA"){env=append(env,item)}}
 return append(env,"MAGIC_REPOSITORY_ROOT="+root,"MAGIC_DESKTOP_USER_DATA="+profile)
}
func prepare(root,cache,profile string)(Manifest,error){
 var m Manifest;b,e:=os.ReadFile(filepath.Join(root,"desktop-client.json"));if e!=nil{return m,errors.New("找不到桌面发布清单，请在完整仓库中运行启动器")};if e=json.Unmarshal(b,&m);e!=nil{return m,e}
 if m.Version==""||m.ServerVersion!=m.Version||m.GameVersion==""||len(m.Files)==0||len(m.Runtime.Parts)==0{return m,errors.New("桌面发布清单不完整")}
 for f,h:=range m.Files{if e=check(root,f,h);e!=nil{return m,e}}
 // A fixed local cache keeps the SDK out of Git history after its first release.
 marker:=filepath.Join(cache,"repository-runtime.json");var prior struct{Version string `json:"version"`}
 if b,e=os.ReadFile(marker);e==nil{_ = json.Unmarshal(b,&prior)}
 _,exeErr:=os.Stat(filepath.Join(cache,"魔法王座.exe"))
 // Retire any cached full update so only the pulled repository can run.
 _,legacyErr:=os.Stat(filepath.Join(cache,"resources","app.asar"))
 if prior.Version!=m.Runtime.Version||exeErr!=nil||legacyErr==nil{
  for _,p:=range m.Runtime.Parts{if e=check(root,p.File,p.SHA256);e!=nil{return m,e}}
  parent:=filepath.Dir(cache);if e=os.MkdirAll(parent,0700);e!=nil{return m,e};stage,e:=os.MkdirTemp(parent,".repository-stage-");if e!=nil{return m,e}
  defer func(){if filepath.Dir(stage)==parent&&strings.HasPrefix(filepath.Base(stage),".repository-stage-"){_ = os.RemoveAll(stage)}}()
  archive:=filepath.Join(stage,"runtime.zip");out,e:=os.Create(archive);if e!=nil{return m,e};h:=sha256.New()
  for _,p:=range m.Runtime.Parts{f,_:=inside(root,p.File);src,err:=os.Open(f);if err!=nil{out.Close();return m,err};_,err=io.Copy(io.MultiWriter(out,h),src);src.Close();if err!=nil{out.Close();return m,err}}
  if e=out.Close();e!=nil{return m,e};if hex.EncodeToString(h.Sum(nil))!=m.Runtime.SHA256{return m,errors.New("运行环境完整校验失败")}
  extracted:=filepath.Join(stage,"client");if e=unzip(archive,extracted);e!=nil{return m,e}
  if _,e=os.Stat(filepath.Join(extracted,"魔法王座.exe"));e!=nil{return m,errors.New("运行环境缺少程序入口")}
  backup:=cache+".previous";if _,e=os.Stat(backup);e==nil{return m,errors.New("上次准备未完成，请检查本机 repository-client.previous")}
  hadOld:=false;if _,e=os.Stat(cache);e==nil{if e=os.Rename(cache,backup);e!=nil{return m,e};hadOld=true}
  if e=os.Rename(extracted,cache);e!=nil{if hadOld{_ = os.Rename(backup,cache)};return m,e}
  if e=save(marker,map[string]string{"version":m.Runtime.Version});e!=nil{return m,e}
  if hadOld&&filepath.Dir(backup)==parent&&filepath.Base(backup)=="repository-client.previous"{_ = os.RemoveAll(backup)}
 }
 app:=filepath.Join(cache,"resources","app");if e=os.MkdirAll(app,0700);e!=nil{return m,e}
 // No node_modules, npm, or separately installed Node.js is needed by players.
 if e=os.WriteFile(filepath.Join(app,"main.cjs"),[]byte("import(require('node:url').pathToFileURL(require('node:path').join(process.env.MAGIC_REPOSITORY_ROOT,'client/desktop/main.mjs')).href).catch(e=>{require('electron').dialog.showErrorBox('启动失败',e.message);require('electron').app.quit();});"),0600);e!=nil{return m,e}
 if e=save(filepath.Join(app,"package.json"),map[string]any{"name":"magic-siege-desktop","version":m.Version,"main":"main.cjs"});e!=nil{return m,e}
 if e=save(filepath.Join(cache,"VERSION.json"),map[string]any{"serverVersion":m.Version,"clientVersion":m.Version,"gameVersion":m.GameVersion,"protocolVersion":m.ProtocolVersion,"electronVersion":strings.Split(m.Runtime.Version,"-")[0]});e!=nil{return m,e}
 e=save(filepath.Join(profile,"repository-source.json"),map[string]string{"root":root,"launcher":filepath.Join(root,"魔法王座.exe")})
 return m,e
}
func run()error{
 exe,_:=os.Executable();rootArg:=flag.String("root",filepath.Dir(exe),"");cacheArg:=flag.String("cache","","");profileArg:=flag.String("profile","","");only:=flag.Bool("prepare-only",false,"");waitPID:=flag.Uint("wait-pid",0,"");flag.Parse()
 root,e:=filepath.Abs(*rootArg);if e!=nil{return e};cache:=*cacheArg;if cache==""{cache=filepath.Join(root,".desktop-cache","repository-client")};cache,e=filepath.Abs(cache);if e!=nil{return e}
 if filepath.Base(cache)!="repository-client"{return errors.New("本机缓存目录无效")}
 profile:=*profileArg;if profile==""{profile=os.Getenv("MAGIC_DESKTOP_USER_DATA")};if profile==""{profile=filepath.Join(os.Getenv("APPDATA"),"Magic Siege")}
 if *waitPID>0{if e=waitForPID(uintptr(*waitPID));e!=nil{return e}}
 m,e:=prepare(root,cache,profile);if e!=nil{return e};if *only{return json.NewEncoder(os.Stdout).Encode(map[string]any{"version":m.Version,"cache":cache,"prepared":true})}
 if os.Getenv("MAGIC_DESKTOP_TEST")!="1"{if e=closeOlderWindow(m.Version);e!=nil{return e}}
 cmd:=exec.Command(filepath.Join(cache,"魔法王座.exe"));cmd.Dir=root;cmd.Env=launchEnvironment(root,profile);cmd.SysProcAttr=&syscall.SysProcAttr{HideWindow:true};return cmd.Start()
}
func main(){
 runtime.LockOSThread();err:=run();if err!=nil{fmt.Fprintln(os.Stderr,err);if !strings.Contains(strings.Join(os.Args," "),"--prepare-only"){user32.NewProc("MessageBoxW").Call(0,uintptr(unsafe.Pointer(wide(err.Error()))),uintptr(unsafe.Pointer(wide("魔法王座启动失败"))),0x10)};os.Exit(1)}
}
