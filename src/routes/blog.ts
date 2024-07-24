import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { createBlogInput,updateBlogInput } from "blog-sphere-common";
export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables:{
        userId:string
    }
}>();
blogRouter.use("*", async (c, next) => {
    const authHeader = c.req.header("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    try {
        const user = await verify(token, c.env.JWT_SECRET);
        if (user) {
            c.set("userId", user.id as string);
            await next();
        } else {
            c.status(403);
            return c.json({ message: "You are not logged in" });
        }
    } catch (error) {
        c.status(403);
        return c.json({ message: "Invalid token" });
    }
});
blogRouter.post("/",async (c)=>{
    const body=await c.req.json();
    const {success}=createBlogInput.safeParse(body);
    if(!success){
        return c.json({
            message:"you have sent wrong inputs"
        })
    }
    const authorId=c.get("userId");
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())
    const blog=await prisma.blog.create({
        data:{
            title:body.title,
            content:body.content,
            authorId:Number(authorId)
        }
    })
    return c.json({
        id:blog.id 
    })
})
blogRouter.get("/bulk",async (c)=>{
    const body=await c.req.json();
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const blogs=await prisma.blog.findMany()
    return c.json({
        blogs 
    })
})


blogRouter.put("/",async (c)=>{
    const body=await c.req.json();
    const {success}=updateBlogInput.safeParse(body);
    if(!success){
        return c.json({
            message:"you have sent wrong inputs"
        })
    }
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())
    const blog=await prisma.blog.update({
      where:{
        id:body.id
      },
        data:{
            title:body.title,
            content:body.content,
         
        }
    })
    return c.json({
        id:blog.id 
        
    })
})
blogRouter.get("/:id",async (c)=>{
    const id=c.req.param("id")
    const prisma=new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL
    }).$extends(withAccelerate())
   try{
    const blog=await prisma.blog.findFirst({
        where:{
            id:Number(id)
          }
        })

    return c.json({
        blog
    })
   }
catch(e){
    c.status(411);
    return c.json({
        message:"error while finding blog post"
    })
}
})
