const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

async function getConnection(){
    const connection = await mysql.createConnection({
        host : 'localhost',
        user : 'root',
        password : 'adminuser',
        database : 'mystargram'
    });
    return connection;
}


// 업로드 폴더 생성 - fs 를 require 에서 끌고 온 이유
// 업로드용 폴더로 사용할 폴더를 조사해보고 없으면 생성, 있으면 그 폴더를 이용(그냥 지나감)
try{
    fs.readdirSync("uploads");
}catch(err){
    console.error("uploads 폴더가 없어 uploads 폴더를 생성합니다.");
    fs.mkdirSync("uploads");
}

// multer 를 이용해서 업로드를 수행할 객체를 생성합니다.
// const multerObj = multer();
// const multerObj = multer({storage:multer.diskStorage({ destination(){}, filename(){}, }), limits:{}})
const multerObj = multer(
    {
        storage:multer.diskStorage(
            {
                destination(req, file, done){ // 업로드된 파일이 저장될 폴더 설정
                    done(null, "uploads/");
                },
                filename(req, file, done){ // 업로드된 파일이 저장되기 전 파일이름을 변경하는 설정
                    const ext = path.extname(file.originalname);
                    const fn = path.basename(file.originalname, ext) + Date.now() + ext;
                    // abc.jpg -> abc + "1234567" + ".jpg";
                    done(null, fn);
                },
            }
        ), 
        limits:{
            fileSize: 5 * 1024 * 1024,
        },
    }
);


router.post("/fileupload", multerObj.single("image"), async(req, res)=>{
    console.log("savefilename : " + req.file.filename);
    const savefilename = req.file.filename;

    res.send({savefilename:savefilename});
})

router.post("/emailCheck", async(req, res)=>{
    const {email} = req.body;

    try{
        const connection = await getConnection();
        const sql = "select* from member where email=?";
        const [rows, fields] = await connection.query(sql, [email]);

        if(rows.length >= 1){
            res.send({message:"NO"})
        }else{
            res.send({message:"OK"})
        }

    }catch(err){
        next(err);
        res.send({msg:"NO"});
    }
})

router.post("/nickNameCheck", async(req,res)=>{
    const {nickname} = req.body;

    try{
        const connection = await getConnection();
        const sql = "select* from member where nickname=?";
        const [rows, fields] = await connection.query(sql, [nickname]);

        if(rows.length >= 1){
            res.send({message:"NO"})
        }else{
            res.send({message:"OK"})
        }

    }catch(err){
        next(err);
        res.send({msg:"NO"});
    }
})

router.post("/insertMember",  async(req,res)=>{
    const {email, pwd, nickname, phone, intro, savefilename} = req.body;

    try{
        const connection = await getConnection();
        const sql = "insert into member(email, pwd, nickname, phone, profilemsg, profileimg) values(?,?,?,?,?,?)";
        const [result, fields] = await connection.query(sql, [email, pwd, nickname, phone, intro, savefilename]);

        res.send({message:"OK"})

    }catch(err){
        next(err);
        res.send({msg:"NO"});
    }

})

const passport = require("passport");

router.post("/loginLocal", async(req,res,next)=>{
    passport.authenticate("local", (authError, user, info)=>{
        if(authError){ //이메일과 비밀번호와 상관없이 에러가 서버에서 발생했을 때
            console.error(err)
            return;
        }

        if(!user){ //이메일이 없거나 패스워드가 틀리면
            console.log(info.message);
            return res.send({message:info.message});
        }

        //정상로그인(req가 자기가 스스로 내장되어 갖고 있는 함수 login())
        return req.login(user, (loginError)=>{
            if(loginError){
                console.error(loginError);
                return next(loginError);
            }
            return res.send({message:"OK", loginUser:req.user})
        })
    })(req, res, next)
})

router.get("/getLoginUser", async(req,res)=>{

    const loginUser = req.user;

    try{
        const connection = await getConnection();
        let sql = "select* from follow where follow_from=?"; 
        let [rows, fields] = await connection.query(sql, [req.user.nickname]);

        let followers = (rows.length >= 1) ? (
            rows.map((f)=>{
                f.follow_to;
            })
        ) : [];

        sql = "select* from follow where follow_to=?"; 
        let [rows2, fields2] = await connection.query(sql, [req.user.nickname]);

        let followings = (rows.length >= 1) ? (
            rows.map((f)=>{
                f.follow_from;
            })
        ) : [];

        res.send({loginUser:loginUser, followers:followers, followings:followings});

    }catch(err){
        console.error(err);
    }

})

router.get("/logout", async(req,res)=>{
    req.session.destroy();
    res.send("OK");
})




module.exports = router;